package api

import (
	"net/http"
	"time"
)

type HealthResponse struct {
	Status    string `json:"status"`
	Timestamp string `json:"timestamp"`
	DbOK      bool   `json:"db_ok"`
}

func (s *Server) handleHealth() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		dbOK := true
		if s.db == nil {
			dbOK = false
		} else if err := s.db.Ping(); err != nil {
			dbOK = false
		}

		status := "ok"
		if !dbOK {
			status = "degraded"
		}

		writeJSON(w, http.StatusOK, HealthResponse{
			Status:    status,
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			DbOK:      dbOK,
		})
	}
}
