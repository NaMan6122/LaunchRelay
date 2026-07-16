package api

import (
	"encoding/json"
	"net/http"
)

type ConversionRequest struct {
	ImpressionID string `json:"impression_id"`
	StartupID    string `json:"startup_id"`
}

type ConversionResponse struct {
	Accepted bool `json:"accepted"`
}

func (s *Server) handleConversion() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req ConversionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if req.ImpressionID == "" || req.StartupID == "" {
			writeError(w, http.StatusBadRequest, "impression_id and startup_id are required")
			return
		}

		// Verify the impression exists and the startup owns it (shown_startup_id matches)
		var viewerStartupID, shownStartupID string
		err := s.db.QueryRow(`
			SELECT viewer_startup_id, shown_startup_id
			FROM impressions WHERE id = $1
		`, req.ImpressionID).Scan(&viewerStartupID, &shownStartupID)
		if err != nil {
			writeError(w, http.StatusNotFound, "impression not found")
			return
		}

		if shownStartupID != req.StartupID {
			writeError(w, http.StatusForbidden, "startup does not own this impression")
			return
		}

		_, err = s.db.Exec(`
			INSERT INTO conversions (impression_id, viewer_startup_id, shown_startup_id)
			VALUES ($1, $2, $3)
			ON CONFLICT (impression_id) DO NOTHING
		`, req.ImpressionID, viewerStartupID, shownStartupID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to record conversion")
			return
		}

		writeOK(w, ConversionResponse{Accepted: true})
	}
}
