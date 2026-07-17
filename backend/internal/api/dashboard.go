package api

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
)

type DashboardResponse struct {
	StartupID     string            `json:"startup_id"`
	Overview      DashboardOverview `json:"overview"`
	Reciprocity   ReciprocityInfo   `json:"reciprocity"`
	RecentMatches []RecentMatch     `json:"recent_matches"`
	Trust         DashboardTrust    `json:"trust"`
	Breakdowns    *Breakdowns       `json:"breakdowns,omitempty"`
}

type Breakdowns struct {
	ByDevice  []DeviceBreakdown  `json:"by_device"`
	ByReferrer []ReferrerBreakdown `json:"by_referrer"`
	ByCountry  []CountryBreakdown `json:"by_country"`
}

type DeviceBreakdown struct {
	DeviceType string  `json:"device_type"`
	Impressions int    `json:"impressions"`
	Percentage  float64 `json:"percentage"`
}

type ReferrerBreakdown struct {
	Source      string `json:"source"`
	Impressions int    `json:"impressions"`
}

type CountryBreakdown struct {
	Country     string `json:"country"`
	Impressions int    `json:"impressions"`
}

type DayBucket struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type DashboardOverview struct {
	Impressions7d      int        `json:"impressions_7d"`
	Clicks7d           int        `json:"clicks_7d"`
	CTR                float64    `json:"ctr"`
	ReciprocityBalance int        `json:"reciprocity_balance"`
	ImpressionsByDay   []DayBucket `json:"impressions_by_day,omitempty"`
	ClicksByDay        []DayBucket `json:"clicks_by_day,omitempty"`
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

		// Daily bucketed impressions (for sparklines)
		func() {
			dRows, err := s.db.Query(`
				SELECT TO_CHAR(timestamp, 'YYYY-MM-DD') as day, COUNT(*) as cnt
				FROM impressions
				WHERE viewer_startup_id = $1 AND timestamp >= $2
				GROUP BY day ORDER BY day
			`, startupID, sevenDaysAgo)
			if err != nil {
				return
			}
			defer dRows.Close()
			for dRows.Next() {
				var b DayBucket
				dRows.Scan(&b.Date, &b.Count)
				resp.Overview.ImpressionsByDay = append(resp.Overview.ImpressionsByDay, b)
			}
		}()
		func() {
			dRows, err := s.db.Query(`
				SELECT TO_CHAR(c.timestamp, 'YYYY-MM-DD') as day, COUNT(*) as cnt
				FROM clicks c
				JOIN impressions i ON i.id = c.impression_id
				WHERE i.viewer_startup_id = $1 AND c.timestamp >= $2
				GROUP BY day ORDER BY day
			`, startupID, sevenDaysAgo)
			if err != nil {
				return
			}
			defer dRows.Close()
			for dRows.Next() {
				var b DayBucket
				dRows.Scan(&b.Date, &b.Count)
				resp.Overview.ClicksByDay = append(resp.Overview.ClicksByDay, b)
			}
		}()

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

		// Breakdowns
		if resp.Overview.Impressions7d > 0 {
			breakdowns := &Breakdowns{}
			total7d := float64(resp.Overview.Impressions7d)

			// By device type
			func() {
				dRows, err := s.db.Query(`
					SELECT COALESCE(device_type, 'desktop') as device_type, COUNT(*) as cnt
					FROM impressions
					WHERE viewer_startup_id = $1 AND timestamp >= $2
					GROUP BY device_type
					ORDER BY cnt DESC
				`, startupID, sevenDaysAgo)
				if err != nil {
					return
				}
				defer dRows.Close()
				for dRows.Next() {
					var d DeviceBreakdown
					dRows.Scan(&d.DeviceType, &d.Impressions)
					if total7d > 0 {
						d.Percentage = float64(d.Impressions) / total7d * 100
					}
					breakdowns.ByDevice = append(breakdowns.ByDevice, d)
				}
			}()
			if breakdowns.ByDevice == nil {
				breakdowns.ByDevice = []DeviceBreakdown{}
			}

			// By referrer
			func() {
				rRows, err := s.db.Query(`
					SELECT COALESCE(NULLIF(referrer, ''), 'direct') as source, COUNT(*) as cnt
					FROM impressions
					WHERE viewer_startup_id = $1 AND timestamp >= $2
					GROUP BY source
					ORDER BY cnt DESC
					LIMIT 10
				`, startupID, sevenDaysAgo)
				if err != nil {
					return
				}
				defer rRows.Close()
				for rRows.Next() {
					var r ReferrerBreakdown
					rRows.Scan(&r.Source, &r.Impressions)
					breakdowns.ByReferrer = append(breakdowns.ByReferrer, r)
				}
			}()
			if breakdowns.ByReferrer == nil {
				breakdowns.ByReferrer = []ReferrerBreakdown{}
			}

			// By country
			func() {
				cRows, err := s.db.Query(`
					SELECT COALESCE(NULLIF(country, ''), 'unknown') as country, COUNT(*) as cnt
					FROM impressions
					WHERE viewer_startup_id = $1 AND timestamp >= $2
					GROUP BY country
					ORDER BY cnt DESC
					LIMIT 10
				`, startupID, sevenDaysAgo)
				if err != nil {
					return
				}
				defer cRows.Close()
				for cRows.Next() {
					var c CountryBreakdown
					cRows.Scan(&c.Country, &c.Impressions)
					breakdowns.ByCountry = append(breakdowns.ByCountry, c)
				}
			}()
			if breakdowns.ByCountry == nil {
				breakdowns.ByCountry = []CountryBreakdown{}
			}

			resp.Breakdowns = breakdowns
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
