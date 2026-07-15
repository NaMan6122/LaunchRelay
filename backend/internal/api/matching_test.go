package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

func setupTestData(t *testing.T, s *Server) (string, string) {
	t.Helper()
	seedCategories(t, s)

	// Create two startups with matching categories
	id1 := createTestStartup(t, s, uniqueName("MatchRequester"))
	id2 := createTestStartup(t, s, uniqueName("MatchPartner"))

	// Activate both
	s.db.Exec(`UPDATE startups SET status = 'active' WHERE id = $1`, id1)
	s.db.Exec(`UPDATE startups SET status = 'active' WHERE id = $1`, id2)

	// Assign matching categories
	var catID string
	s.db.QueryRow(`SELECT id FROM categories WHERE name = 'devtools'`).Scan(&catID)
	s.db.Exec(`INSERT INTO startup_categories (startup_id, category_id) VALUES ($1, $2)`, id1, catID)
	s.db.Exec(`INSERT INTO startup_categories (startup_id, category_id) VALUES ($1, $2)`, id2, catID)

	return id1, id2
}

func TestMatchReturnsPartner(t *testing.T) {
	s := setupTestServer(t)
	id1, _ := setupTestData(t, s)

	req := httptest.NewRequest(
		http.MethodGet,
		fmt.Sprintf("/v1/match?startup_id=%s&host_domain=example.com", id1),
		nil,
	)
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp MatchResponse
	json.NewDecoder(w.Body).Decode(&resp)

	if resp.Match.ID == "" {
		t.Error("expected non-empty match ID")
	}
	if resp.Match.Name == "" {
		t.Error("expected non-empty match name")
	}
	if resp.ImpressionID == "" {
		t.Error("expected non-empty impression ID")
	}
	if resp.ExpiresAt == "" {
		t.Error("expected non-empty expires_at")
	}
}

func TestMatchDoesNotReturnInactivePartner(t *testing.T) {
	s := setupTestServer(t)
	id1, id2 := setupTestData(t, s)

	s.db.Exec(`UPDATE startups SET status = 'paused' WHERE id = $1`, id2)

	req := httptest.NewRequest(
		http.MethodGet,
		fmt.Sprintf("/v1/match?startup_id=%s&host_domain=example.com", id1),
		nil,
	)
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	var resp MatchResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Match.ID == id2 {
		t.Errorf("match should not return an inactive partner, got %s", resp.Match.ID)
	}
}

func TestMatchRequiresParams(t *testing.T) {
	s := setupTestServer(t)

	req := httptest.NewRequest(http.MethodGet, "/v1/match", nil)
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestMatchStartupNotFound(t *testing.T) {
	s := setupTestServer(t)

	req := httptest.NewRequest(
		http.MethodGet,
		"/v1/match?startup_id=00000000-0000-0000-0000-000000000000&host_domain=example.com",
		nil,
	)
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestMatchNonActiveStartup(t *testing.T) {
	s := setupTestServer(t)
	id := createTestStartup(t, s, uniqueName("NonActive"))
	// Don't activate

	req := httptest.NewRequest(
		http.MethodGet,
		fmt.Sprintf("/v1/match?startup_id=%s&host_domain=example.com", id),
		nil,
	)
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204 for non-active, got %d: %s", w.Code, w.Body.String())
	}
}

func TestMatchUsesCache(t *testing.T) {
	s := setupTestServer(t)
	id1, id2 := setupTestData(t, s)

	// First match populates cache
	req1 := httptest.NewRequest(
		http.MethodGet,
		fmt.Sprintf("/v1/match?startup_id=%s&host_domain=example.com", id1),
		nil,
	)
	w1 := httptest.NewRecorder()
	s.router.ServeHTTP(w1, req1)

	if w1.Code != http.StatusOK {
		t.Fatalf("first match expected 200, got %d", w1.Code)
	}

	// Make partner inactive after cache is set
	s.db.Exec(`UPDATE startups SET status = 'paused' WHERE id = $1`, id2)

	// Second match should return cached result even though partner is now inactive
	req2 := httptest.NewRequest(
		http.MethodGet,
		fmt.Sprintf("/v1/match?startup_id=%s&host_domain=example.com", id1),
		nil,
	)
	w2 := httptest.NewRecorder()
	s.router.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Errorf("expected 200 (cached), got %d: %s", w2.Code, w2.Body.String())
	}
}
