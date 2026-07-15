package api

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

type DashboardResponse struct {
	StartupID string            `json:"startup_id"`
	Overview  DashboardOverview `json:"overview"`
	Reciprocity ReciprocityInfo `json:"reciprocity"`
	RecentMatches []RecentMatch `json:"recent_matches"`
	Trust       DashboardTrust  `json:"trust"`
}

type DashboardOverview struct {
	Impressions7d    int     `json:"impressions_7d"`
	Clicks7d         int     `json:"clicks_7d"`
	CTR              float64 `json:"ctr"`
	ReciprocityBalance int   `json:"reciprocity_balance"`
}

type ReciprocityInfo struct {
	Balance           int `json:"balance"`
	ImpressionsGiven  int `json:"impressions_given"`
	ImpressionsReceived int `json:"impressions_received"`
}

type RecentMatch struct {
	StartupID   string `json:"startup_id"`
	Name        string `json:"name"`
	Impressions int    `json:"impressions"`
	Clicks      int    `json:"clicks"`
}

type DashboardTrust struct {
	Score          float64 `json:"score"`
	LastVerifiedAt string  `json:"last_verified_at,omitempty"`
	Status         string  `json:"status"`
}

func (s *Server) handleDashboard() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		startupID := chi.URLParam(r, "startup_id")

		var exists bool
		s.db.Get(&exists, `SELECT EXISTS(SELECT 1 FROM startups WHERE id = $1)`, startupID)
		if !exists {
			writeError(w, http.StatusNotFound, "startup not found")
			return
		}

		resp := DashboardResponse{StartupID: startupID}
		sevenDaysAgo := time.Now().UTC().AddDate(0, 0, -7)

		// 7-day impressions
		s.db.Get(&resp.Overview.Impressions7d, `
			SELECT COUNT(*) FROM impressions
			WHERE viewer_startup_id = $1 AND timestamp >= $2
		`, startupID, sevenDaysAgo)

		// 7-day clicks
		s.db.Get(&resp.Overview.Clicks7d, `
			SELECT COUNT(*) FROM clicks c
			JOIN impressions i ON i.id = c.impression_id
			WHERE i.viewer_startup_id = $1 AND c.timestamp >= $2
		`, startupID, sevenDaysAgo)

		if resp.Overview.Impressions7d > 0 {
			resp.Overview.CTR = float64(resp.Overview.Clicks7d) / float64(resp.Overview.Impressions7d)
		}

		// Reciprocity balance
		s.db.Get(&resp.Reciprocity, `
			SELECT COALESCE(balance, 0) as balance,
			       COALESCE(impressions_given, 0) as impressions_given,
			       COALESCE(impressions_received, 0) as impressions_received
			FROM reciprocity_ledger
			WHERE startup_id = $1
			ORDER BY period_start DESC LIMIT 1
		`, startupID)
		resp.Overview.ReciprocityBalance = resp.Reciprocity.Balance

		// Recent matches (top 10 by impressions)
		rows, err := s.db.Query(`
			SELECT i.shown_startup_id, s.name, COUNT(*) as impressions,
			       (SELECT COUNT(*) FROM clicks c WHERE c.impression_id = i.id) as clicks
			FROM impressions i
			JOIN startups s ON s.id = i.shown_startup_id
			WHERE i.viewer_startup_id = $1 AND i.timestamp >= $2
			GROUP BY i.shown_startup_id, s.name, i.id
			ORDER BY impressions DESC LIMIT 10
		`, startupID, sevenDaysAgo)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var m RecentMatch
				rows.Scan(&m.StartupID, &m.Name, &m.Impressions, &m.Clicks)
				resp.RecentMatches = append(resp.RecentMatches, m)
			}
		}

		// Trust info
		var trustScore float64
		s.db.Get(&trustScore, `SELECT trust_score FROM startups WHERE id = $1`, startupID)

		var lastVerified time.Time
		var embedStatus string
		s.db.Get(&lastVerified, `
			SELECT COALESCE(MAX(last_verified_at), '1970-01-01'::timestamptz)
			FROM embed_instances WHERE startup_id = $1
		`, startupID)
		s.db.Get(&embedStatus, `SELECT status FROM startups WHERE id = $1`, startupID)

		resp.Trust = DashboardTrust{
			Score:          trustScore,
			LastVerifiedAt: lastVerified.Format(time.RFC3339),
			Status:         embedStatus,
		}

		if lastVerified.Year() <= 1970 {
			resp.Trust.LastVerifiedAt = ""
		}

		writeOK(w, resp)
	}
}
