package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/launchrelay/backend/internal/db"
)

func TestHealthEndpoint(t *testing.T) {
	// Connect to the real database (skip if unavailable)
	cfg := db.ConfigFromEnv()
	database, err := db.Connect(cfg)
	if err != nil {
		t.Skipf("database not available: %v", err)
	}
	defer database.Close()

	server := New(database)

	// Create a test request
	req := httptest.NewRequest(http.MethodGet, "/v1/health", nil)
	w := httptest.NewRecorder()
	server.router.ServeHTTP(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	var body HealthResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if body.Status != "ok" {
		t.Errorf("expected status ok, got %s", body.Status)
	}
	if !body.DbOK {
		t.Errorf("expected db_ok true")
	}
	if body.Timestamp == "" {
		t.Errorf("expected non-empty timestamp")
	}
}

func TestHealthEndpointNoDb(t *testing.T) {
	// This tests that the handler gracefully handles a nil DB
	server := New(nil)

	req := httptest.NewRequest(http.MethodGet, "/v1/health", nil)
	w := httptest.NewRecorder()
	server.router.ServeHTTP(w, req)

	var body HealthResponse
	json.NewDecoder(w.Result().Body).Decode(&body)

	if body.Status != "degraded" {
		t.Errorf("expected status degraded, got %s", body.Status)
	}
	if body.DbOK {
		t.Errorf("expected db_ok false")
	}
}
