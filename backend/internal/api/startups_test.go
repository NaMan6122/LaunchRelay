package api

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/launchrelay/backend/internal/db"
)

func seedCategories(t *testing.T, s *Server) {
	t.Helper()
	cats := []string{"devtools", "fintech", "saas", "consumer", "no-code"}
	for _, c := range cats {
		_, err := s.db.Exec(
			`INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			c, c,
		)
		if err != nil {
			t.Fatalf("seed category %s: %v", c, err)
		}
	}
}

func setupTestServer(t *testing.T) *Server {
	t.Helper()
	cfg := db.ConfigFromEnv()
	database, err := db.Connect(cfg)
	if err != nil {
		t.Skipf("database not available: %v", err)
	}
	t.Cleanup(func() { database.Close() })
	return New(database)
}

func uniqueName(prefix string) string {
	n, _ := rand.Int(rand.Reader, big.NewInt(99999))
	return fmt.Sprintf("%s-%d", prefix, n.Int64())
}

func createTestStartup(t *testing.T, s *Server, name string) string {
	t.Helper()
	slug := toSlug(name)
	var id string
	err := s.db.QueryRow(
		`INSERT INTO startups (name, url, slug, one_line_pitch, email, status)
		 VALUES ($1, $2, $3, $4, $5, 'active') RETURNING id`,
		name, "https://"+slug+".com", slug, "test pitch", "test@"+slug+".com",
	).Scan(&id)
	if err != nil {
		t.Fatalf("create test startup: %v", err)
	}
	t.Cleanup(func() {
		s.db.Exec(`DELETE FROM startup_categories WHERE startup_id = $1`, id)
		s.db.Exec(`DELETE FROM impressions WHERE viewer_startup_id = $1 OR shown_startup_id = $1`, id)
		s.db.Exec(`DELETE FROM clicks WHERE impression_id IN (SELECT id FROM impressions WHERE viewer_startup_id = $1 OR shown_startup_id = $1)`, id)
		s.db.Exec(`DELETE FROM webhooks WHERE startup_id = $1`, id)
		s.db.Exec(`DELETE FROM competitor_exclusions WHERE startup_id = $1 OR excluded_startup_id = $1`, id)
		s.db.Exec(`DELETE FROM auth_tokens WHERE startup_id = $1`, id)
		s.db.Exec(`DELETE FROM startups WHERE id = $1`, id)
	})
	return id
}

func TestCreateStartup(t *testing.T) {
	s := setupTestServer(t)
	seedCategories(t, s)

	name := uniqueName("CreateTest")
	body := fmt.Sprintf(
		`{"name":"%s","url":"https://test.com","one_line_pitch":"A test startup","categories":["devtools"],"email":"test@test.com"}`,
		name,
	)
	req := httptest.NewRequest(http.MethodPost, "/v1/startups", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp StartupResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Name != name {
		t.Errorf("expected name %s, got %s", name, resp.Name)
	}
	if resp.Status != "active" {
		t.Errorf("expected status active, got %s", resp.Status)
	}
	if resp.EmbedCode == "" {
		t.Errorf("expected non-empty embed code")
	}
	if !strings.Contains(resp.EmbedCode, resp.ID) {
		t.Errorf("embed code should contain startup ID")
	}
}

func TestCreateStartupMissingFields(t *testing.T) {
	s := setupTestServer(t)

	tests := []struct {
		name string
		body string
	}{
		{"empty body", `{}`},
		{"missing name", `{"url":"https://test.com","one_line_pitch":"test","email":"test@test.com"}`},
		{"missing url", `{"name":"Test","one_line_pitch":"test","email":"test@test.com"}`},
		{"missing pitch", `{"name":"Test","url":"https://test.com","email":"test@test.com"}`},
		{"missing email", `{"name":"Test","url":"https://test.com","one_line_pitch":"test"}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/v1/startups", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			s.router.ServeHTTP(w, req)

			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
			}
		})
	}
}

func TestCreateStartupInvalidURL(t *testing.T) {
	s := setupTestServer(t)

	body := `{"name":"Test","url":"not-a-url","one_line_pitch":"test","email":"test@test.com"}`
	req := httptest.NewRequest(http.MethodPost, "/v1/startups", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}

	var errResp ErrorResponse
	json.NewDecoder(w.Body).Decode(&errResp)
	if !strings.Contains(errResp.Error, "URL") {
		t.Errorf("expected error about URL, got: %s", errResp.Error)
	}
}

func TestUpdateStartupStatus(t *testing.T) {
	s := setupTestServer(t)
	seedCategories(t, s)

	startupID := createTestStartup(t, s, uniqueName("UpdateTest"))

	body := `{"status":"active"}`
	req := httptest.NewRequest(http.MethodPatch, "/v1/startups/"+startupID, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var status string
	s.db.QueryRow(`SELECT status FROM startups WHERE id = $1`, startupID).Scan(&status)
	if status != "active" {
		t.Errorf("expected status active, got %s", status)
	}
}

func TestUpdateStartupNotFound(t *testing.T) {
	s := setupTestServer(t)

	body := `{"status":"active"}`
	req := httptest.NewRequest(http.MethodPatch, "/v1/startups/00000000-0000-0000-0000-000000000000", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestGetStartup(t *testing.T) {
	s := setupTestServer(t)
	seedCategories(t, s)

	id := createTestStartup(t, s, uniqueName("GetTest"))

	var catID string
	s.db.QueryRow(`SELECT id FROM categories WHERE name = 'devtools'`).Scan(&catID)
	s.db.Exec(`INSERT INTO startup_categories (startup_id, category_id) VALUES ($1, $2)`, id, catID)

	req := httptest.NewRequest(http.MethodGet, "/v1/startups/"+id, nil)
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp StartupResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.ID != id {
		t.Errorf("expected ID %s, got %s", id, resp.ID)
	}
	if len(resp.Categories) != 1 || resp.Categories[0] != "devtools" {
		t.Errorf("expected categories [devtools], got %v", resp.Categories)
	}
}

func TestListCategories(t *testing.T) {
	s := setupTestServer(t)
	seedCategories(t, s)

	req := httptest.NewRequest(http.MethodGet, "/v1/categories", nil)
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var cats []CategoryResponse
	json.NewDecoder(w.Body).Decode(&cats)
	if len(cats) < 3 {
		t.Errorf("expected at least 3 categories, got %d", len(cats))
	}
}

func TestCreateExclusion(t *testing.T) {
	s := setupTestServer(t)

	id1 := createTestStartup(t, s, uniqueName("ExclusionA"))
	id2 := createTestStartup(t, s, uniqueName("ExclusionB"))

	body := bytes.NewBufferString(`{"excluded_startup_id":"` + id2 + `"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/startups/"+id1+"/exclusions", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	req2 := httptest.NewRequest(http.MethodGet, "/v1/startups/"+id1+"/exclusions", nil)
	w2 := httptest.NewRecorder()
	s.router.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w2.Code, w2.Body.String())
	}

	var exclusions []ExclusionResponse
	json.NewDecoder(w2.Body).Decode(&exclusions)
	if len(exclusions) != 1 {
		t.Errorf("expected 1 exclusion, got %d", len(exclusions))
	}
}
