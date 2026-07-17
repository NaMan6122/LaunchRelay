package api

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

type Webhook struct {
	ID        string   `json:"id" db:"id"`
	StartupID string   `json:"startup_id" db:"startup_id"`
	URL       string   `json:"url" db:"url"`
	Events    []string `json:"events" db:"events"`
	Active    bool     `json:"active" db:"active"`
}

type CreateWebhookRequest struct {
	URL    string   `json:"url"`
	Events []string `json:"events"`
}

type WebhookEventPayload struct {
	EventType     string `json:"event_type"`
	ImpressionID  string `json:"impression_id,omitempty"`
	ViewerStartup string `json:"viewer_startup"`
	ShownStartup  string `json:"shown_startup"`
	Timestamp     string `json:"timestamp"`
}

func (s *Server) handleCreateWebhook() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		startupID := chi.URLParam(r, "id")

		var exists bool
		s.db.Get(&exists, `SELECT EXISTS(SELECT 1 FROM startups WHERE id = $1)`, startupID)
		if !exists {
			writeError(w, http.StatusNotFound, "startup not found")
			return
		}

		var req CreateWebhookRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.URL == "" {
			writeError(w, http.StatusBadRequest, "url is required")
			return
		}
		if len(req.Events) == 0 {
			req.Events = []string{"conversion"}
		}

		var id string
		err := s.db.QueryRow(`
			INSERT INTO webhooks (startup_id, url, events)
			VALUES ($1, $2, $3)
			RETURNING id
		`, startupID, req.URL, req.Events).Scan(&id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create webhook")
			return
		}

		writeOK(w, map[string]string{"id": id})
	}
}

func (s *Server) handleListWebhooks() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		startupID := chi.URLParam(r, "id")

		var hooks []Webhook
		err := s.db.Select(&hooks, `
			SELECT id, startup_id, url, events, active
			FROM webhooks WHERE startup_id = $1 ORDER BY created_at DESC
		`, startupID)
		if err != nil {
			hooks = []Webhook{}
		}

		writeOK(w, hooks)
	}
}

func (s *Server) handleDeleteWebhook() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		webhookID := chi.URLParam(r, "webhook_id")

		_, err := s.db.Exec(`DELETE FROM webhooks WHERE id = $1`, webhookID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to delete")
			return
		}

		writeOK(w, map[string]bool{"deleted": true})
	}
}

// fireWebhooks sends event payloads to all active webhooks for a startup.
func (s *Server) fireWebhooks(startupID, eventType, impressionID, viewerStartupID, shownStartupID string) {
	var hooks []Webhook
	err := s.db.Select(&hooks, `
		SELECT id, startup_id, url, events, active
		FROM webhooks WHERE startup_id = $1 AND active = true
	`, startupID)
	if err != nil || len(hooks) == 0 {
		return
	}

	payload := WebhookEventPayload{
		EventType:     eventType,
		ImpressionID:  impressionID,
		ViewerStartup: viewerStartupID,
		ShownStartup:  shownStartupID,
		Timestamp:     time.Now().UTC().Format(time.RFC3339),
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return
	}

	for _, hook := range hooks {
		if !contains(hook.Events, eventType) {
			continue
		}
		go func(url string) {
			resp, err := http.Post(url, "application/json", bytes.NewReader(body))
			if err != nil {
				log.Printf("webhook %s: %v", url, err)
				return
			}
			resp.Body.Close()
		}(hook.URL)
	}
}

func contains(slice []string, s string) bool {
	for _, v := range slice {
		if v == s {
			return true
		}
	}
	return false
}
