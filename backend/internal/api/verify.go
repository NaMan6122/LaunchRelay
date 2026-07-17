package api

import (
	"encoding/json"
	"net/http"
)

type VerifyTrafficRequest struct {
	MonthlyVisitors int `json:"monthly_visitors"`
}

type VerifyTrafficResponse struct {
	Verified bool    `json:"verified"`
	Score    float64 `json:"trust_score"`
}

func (s *Server) handleVerifyTraffic() func(http.ResponseWriter, *http.Request, string) {
	return func(w http.ResponseWriter, r *http.Request, startupID string) {

		var exists bool
		s.db.Get(&exists, `SELECT EXISTS(SELECT 1 FROM startups WHERE id = $1)`, startupID)
		if !exists {
			writeError(w, http.StatusNotFound, "startup not found")
			return
		}

		var req VerifyTrafficRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if req.MonthlyVisitors < 1 {
			writeError(w, http.StatusBadRequest, "monthly_visitors must be at least 1")
			return
		}

		// Normalize traffic_rank (1-100 scale based on visitors)
		rank := req.MonthlyVisitors
		if rank > 100000 {
			rank = 100
		} else if rank > 10000 {
			rank = 75
		} else if rank > 1000 {
			rank = 50
		} else if rank > 100 {
			rank = 25
		} else {
			rank = 10
		}

		_, err := s.db.Exec(`
			UPDATE startups
			SET verified_traffic_tier = true, traffic_rank = $1
			WHERE id = $2
		`, rank, startupID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to update")
			return
		}

		score, _ := computeTrustScore(s, startupID)

		writeOK(w, VerifyTrafficResponse{
			Verified: true,
			Score:    score,
		})
	}
}
