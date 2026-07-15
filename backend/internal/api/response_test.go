package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWriteOK(t *testing.T) {
	w := httptest.NewRecorder()
	writeOK(w, map[string]string{"hello": "world"})

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	var body map[string]string
	json.NewDecoder(resp.Body).Decode(&body)
	if body["hello"] != "world" {
		t.Errorf("expected hello=world, got %v", body)
	}
}

func TestWriteCreated(t *testing.T) {
	w := httptest.NewRecorder()
	writeCreated(w, map[string]string{"id": "abc"})

	resp := w.Result()
	if resp.StatusCode != http.StatusCreated {
		t.Errorf("expected 201, got %d", resp.StatusCode)
	}
}

func TestWriteNoContent(t *testing.T) {
	w := httptest.NewRecorder()
	writeNoContent(w)

	resp := w.Result()
	if resp.StatusCode != http.StatusNoContent {
		t.Errorf("expected 204, got %d", resp.StatusCode)
	}
}

func TestWriteError(t *testing.T) {
	w := httptest.NewRecorder()
	writeError(w, http.StatusBadRequest, "invalid request", "missing name")

	resp := w.Result()
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}

	var body ErrorResponse
	json.NewDecoder(resp.Body).Decode(&body)
	if body.Error != "invalid request" {
		t.Errorf("expected error=invalid request, got %v", body.Error)
	}
	if body.Detail != "missing name" {
		t.Errorf("expected detail=missing name, got %v", body.Detail)
	}
}

func TestWriteErrorNoDetail(t *testing.T) {
	w := httptest.NewRecorder()
	writeError(w, http.StatusNotFound, "not found")

	var body ErrorResponse
	json.NewDecoder(w.Result().Body).Decode(&body)
	if body.Detail != "" {
		t.Errorf("expected empty detail, got %v", body.Detail)
	}
}

func TestHealthRoute(t *testing.T) {
	// We need a DB connection for the health handler — skip in unit test
	// This tests that the response format is correct via the write helpers
	w := httptest.NewRecorder()
	writeJSON(w, http.StatusOK, HealthResponse{
		Status:    "ok",
		Timestamp: "2026-01-01T00:00:00Z",
		DbOK:      true,
	})

	var body HealthResponse
	json.NewDecoder(w.Result().Body).Decode(&body)
	if body.Status != "ok" {
		t.Errorf("expected status=ok, got %v", body.Status)
	}
	if !body.DbOK {
		t.Errorf("expected db_ok=true")
	}
}
