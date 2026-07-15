package api

import (
	"database/sql"
	"math"
	"net/http"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/launchrelay/backend/internal/matching"
)

type MatchResponse struct {
	Match struct {
		ID           string   `json:"id"`
		Name         string   `json:"name"`
		OneLinePitch string   `json:"one_line_pitch"`
		URL          string   `json:"url"`
		LogoURL      string   `json:"logo_url"`
		Category     []string `json:"category"`
	} `json:"match"`
	ImpressionID string `json:"impression_id"`
	ExpiresAt    string `json:"expires_at"`
}

type dbStartup struct {
	ID         string         `db:"id"`
	Name       string         `db:"name"`
	URL        string         `db:"url"`
	Pitch      string         `db:"one_line_pitch"`
	LogoURL    sql.NullString `db:"logo_url"`
	Balance    int            `db:"balance"`
	TrustScore float64        `db:"trust_score"`
	Rank       int            `db:"traffic_rank"`
}

func (s *Server) handleMatch() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		startupID := r.URL.Query().Get("startup_id")
		hostDomain := r.URL.Query().Get("host_domain")

		if startupID == "" || hostDomain == "" {
			writeError(w, http.StatusBadRequest, "startup_id and host_domain are required")
			return
		}

		var status string
		err := s.db.Get(&status, `SELECT status FROM startups WHERE id = $1`, startupID)
		if err != nil {
			writeError(w, http.StatusNotFound, "startup not found")
			return
		}
		if status != "active" {
			writeNoContent(w)
			return
		}

		// Check cache
		var cached struct {
			MatchedID string    `db:"matched_startup_id"`
			Name      string    `db:"name"`
			Pitch     string    `db:"one_line_pitch"`
			URL       string    `db:"url"`
			LogoURL   string    `db:"logo_url"`
			ExpiresAt time.Time `db:"expires_at"`
		}
		err = s.db.Get(&cached, `
			SELECT mc.matched_startup_id, s.name, s.one_line_pitch, s.url,
			       COALESCE(s.logo_url, '') as logo_url, mc.expires_at
			FROM match_cache mc
			JOIN startups s ON s.id = mc.matched_startup_id
			WHERE mc.viewer_startup_id = $1 AND mc.expires_at > NOW()
			ORDER BY mc.score DESC LIMIT 1
		`, startupID)
		if err == nil {
			cats, _ := loadCategories(s.db, cached.MatchedID)
			resp := buildMatchResponse(cached.MatchedID, cached.Name, cached.Pitch, cached.URL, cached.LogoURL, cats, cached.ExpiresAt)
			writeOK(w, resp)
			return
		}

		// Load eligible candidates
		startupRows, err := loadEligible(s.db, startupID)
		if err != nil || len(startupRows) == 0 {
			writeNoContent(w)
			return
		}

		balances := make([]int, len(startupRows))
		for i := range startupRows {
			balances[i] = startupRows[i].Balance
		}
		stddev := computeStddev(balances)

		candidates := make([]matching.Startup, len(startupRows))
		for i, d := range startupRows {
			cats, _ := loadCategories(s.db, d.ID)
			candidates[i] = matching.Startup{
				ID:          d.ID,
				Name:        d.Name,
				Categories:  cats,
				Balance:     d.Balance,
				TrustScore:  d.TrustScore,
				TrafficRank: d.Rank,
				Pitch:       d.Pitch,
				URL:         d.URL,
				LogoURL:     d.LogoURL.String,
			}
		}

		requesterCats, _ := loadCategories(s.db, startupID)
		requester := matching.Startup{ID: startupID, Categories: requesterCats}

		ctx := matching.MatchContext{
			Requester:     requester,
			NetworkSize:   len(candidates),
			NetworkStdDev: stddev,
		}

		wg := matching.DefaultWeights()
		selected, err := matching.SelectTopKWeighted(candidates, requester, wg, ctx, 5)
		if err != nil {
			writeNoContent(w)
			return
		}

		expiresAt := time.Now().Add(1 * time.Hour)
		_, _ = s.db.Exec(
			`INSERT INTO match_cache (viewer_startup_id, matched_startup_id, score, expires_at)
			 VALUES ($1, $2, 0, $3) ON CONFLICT DO NOTHING`,
			startupID, selected.ID, expiresAt,
		)

		selectedCats, _ := loadCategories(s.db, selected.ID)
		writeOK(w, buildMatchResponse(selected.ID, selected.Name, selected.Pitch, selected.URL, selected.LogoURL, selectedCats, expiresAt))
	}
}

func loadEligible(db *sqlx.DB, startupID string) ([]dbStartup, error) {
	var rows []dbStartup
	err := db.Select(&rows, `
		SELECT s.id, s.name, s.url, s.one_line_pitch, s.logo_url,
		       COALESCE(lr.balance, 0) as balance, s.trust_score, s.traffic_rank
		FROM startups s
		LEFT JOIN reciprocity_ledger lr ON lr.startup_id = s.id
			AND lr.period_end = (SELECT MAX(period_end) FROM reciprocity_ledger WHERE startup_id = s.id)
		WHERE s.status = 'active' AND s.id <> $1
		AND EXISTS (
			SELECT 1 FROM startup_categories sc
			WHERE sc.startup_id = s.id
			AND sc.category_id IN (
				SELECT category_id FROM startup_categories WHERE startup_id = $1
				UNION
				SELECT adjacent_category_id FROM category_adjacencies
				WHERE category_id IN (SELECT category_id FROM startup_categories WHERE startup_id = $1)
			)
		)
		AND s.id NOT IN (
			SELECT excluded_startup_id FROM competitor_exclusions WHERE startup_id = $1
			UNION SELECT $1
		)
	`, startupID)
	return rows, err
}

func buildMatchResponse(id, name, pitch, url, logoURL string, cats []string, expiresAt time.Time) MatchResponse {
	var resp MatchResponse
	resp.Match.ID = id
	resp.Match.Name = name
	resp.Match.OneLinePitch = pitch
	resp.Match.URL = url
	resp.Match.LogoURL = logoURL
	resp.Match.Category = cats
	resp.ImpressionID = id + "-" + time.Now().UTC().Format("20060102T150405")
	resp.ExpiresAt = expiresAt.UTC().Format(time.RFC3339)
	return resp
}

func loadCategories(db *sqlx.DB, startupID string) ([]string, error) {
	var cats []string
	err := db.Select(&cats, `
		SELECT c.name FROM startup_categories sc
		JOIN categories c ON c.id = sc.category_id
		WHERE sc.startup_id = $1
	`, startupID)
	return cats, err
}

func computeStddev(vals []int) float64 {
	if len(vals) < 2 {
		return 100
	}
	mean := 0.0
	for _, v := range vals {
		mean += float64(v)
	}
	mean /= float64(len(vals))

	variance := 0.0
	for _, v := range vals {
		variance += math.Pow(float64(v)-mean, 2)
	}
	variance /= float64(len(vals) - 1)
	return math.Sqrt(variance)
}
