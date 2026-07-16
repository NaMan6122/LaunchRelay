package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

type ImpressionEvent struct {
	ImpressionID   string `json:"impression_id"`
	ShownStartupID string `json:"shown_startup_id"`
	Verified       bool   `json:"verified"`
	Referrer       string `json:"referrer,omitempty"`
	Timestamp      string `json:"timestamp"`
}

type ImpressionBatchRequest struct {
	ViewerStartupID string           `json:"viewer_startup_id"`
	Events          []ImpressionEvent `json:"events"`
}

type ClickRequest struct {
	StartupID    string `json:"startup_id"`
	ImpressionID string `json:"impression_id"`
	Timestamp    string `json:"timestamp"`
}

type ClickResponse struct {
	Accepted bool `json:"accepted"`
}

type AcceptedResponse struct {
	Accepted int `json:"accepted"`
}

// detectDeviceType returns desktop/mobile/tablet based on User-Agent string.
func detectDeviceType(ua string) string {
	if ua == "" {
		return "desktop"
	}
	uaLower := strings.ToLower(ua)
	if strings.Contains(uaLower, "mobile") || strings.Contains(uaLower, "iphone") || strings.Contains(uaLower, "ipod") {
		return "mobile"
	}
	if strings.Contains(uaLower, "ipad") || strings.Contains(uaLower, "tablet") {
		return "tablet"
	}
	if strings.Contains(uaLower, "android") && !strings.Contains(uaLower, "mobile") {
		return "tablet"
	}
	return "desktop"
}

// detectCountry attempts a rough country estimate from Accept-Language.
func detectCountry(acceptLang string) string {
	if acceptLang == "" {
		return ""
	}
	// Accept-Language: en-US,en;q=0.9 → "US"
	tag := strings.Split(acceptLang, ",")[0]
	tag = strings.Split(tag, ";")[0]
	parts := strings.Split(tag, "-")
	if len(parts) < 2 {
		return ""
	}
	country := strings.ToUpper(parts[1])
	if len(country) != 2 {
		return ""
	}
	return country
}

func (s *Server) handleBatchImpressions() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req ImpressionBatchRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if req.ViewerStartupID == "" || len(req.Events) == 0 {
			writeError(w, http.StatusBadRequest, "viewer_startup_id and events are required")
			return
		}

		if len(req.Events) > 20 {
			writeError(w, http.StatusBadRequest, "max 20 events per batch")
			return
		}

		deviceType := detectDeviceType(r.UserAgent())
		country := detectCountry(r.Header.Get("Accept-Language"))

		accepted := 0
		for _, ev := range req.Events {
			if ev.ImpressionID == "" || ev.ShownStartupID == "" {
				continue
			}

			ts, err := time.Parse(time.RFC3339, ev.Timestamp)
			if err != nil {
				ts = time.Now().UTC()
			}

			referrer := ev.Referrer
			if referrer == "" {
				referrer = r.Referer()
			}

			_, err = s.db.Exec(`
				INSERT INTO impressions (id, viewer_startup_id, shown_startup_id, verified, country, device_type, referrer, timestamp)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
				ON CONFLICT (id) DO NOTHING
			`, ev.ImpressionID, req.ViewerStartupID, ev.ShownStartupID, ev.Verified, country, deviceType, referrer, ts)
			if err == nil {
				accepted++
			}
		}

		writeOK(w, AcceptedResponse{Accepted: accepted})
	}
}

func (s *Server) handleClick() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req ClickRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if req.ImpressionID == "" {
			writeError(w, http.StatusBadRequest, "impression_id is required")
			return
		}

		// Check impression exists
		var exists bool
		err := s.db.Get(&exists, `SELECT EXISTS(SELECT 1 FROM impressions WHERE id = $1)`, req.ImpressionID)
		if err != nil || !exists {
			writeError(w, http.StatusNotFound, "impression not found")
			return
		}

		// Check not already clicked (max 1 click per impression)
		var alreadyClicked bool
		s.db.Get(&alreadyClicked, `SELECT EXISTS(SELECT 1 FROM clicks WHERE impression_id = $1)`, req.ImpressionID)
		if alreadyClicked {
			writeOK(w, ClickResponse{Accepted: false})
			return
		}

		ts, err := time.Parse(time.RFC3339, req.Timestamp)
		if err != nil {
			ts = time.Now().UTC()
		}

		_, err = s.db.Exec(`
			INSERT INTO clicks (impression_id, timestamp)
			VALUES ($1, $2)
		`, req.ImpressionID, ts)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to record click")
			return
		}

		writeOK(w, ClickResponse{Accepted: true})
	}
}
