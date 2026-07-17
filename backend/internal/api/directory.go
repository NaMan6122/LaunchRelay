package api

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

type DirectoryEntry struct {
	id              string   `db:"-" json:"-"`
	Slug            string   `json:"slug"`
	Name            string   `json:"name"`
	Pitch           string   `json:"one_line_pitch"`
	Categories      []string `json:"categories"`
	LogoURL         string   `json:"logo_url,omitempty"`
	JoinedAt        string   `json:"joined_at"`
	TrustScore      float64  `json:"trust_score"`
	VerifiedTraffic bool     `json:"verified_traffic"`
	BoostLevel      int      `json:"boost_level"`
}

type DirectoryResponse struct {
	Data       []DirectoryEntry `json:"data"`
	Pagination PaginationInfo   `json:"pagination"`
}

type StartupProfileResponse struct {
	Slug       string      `json:"slug"`
	Name       string      `json:"name"`
	Pitch      string      `json:"one_line_pitch"`
	URL        string      `json:"url"`
	Categories []string    `json:"categories"`
	LogoURL    string      `json:"logo_url,omitempty"`
	JoinedAt   string      `json:"joined_at"`
	TrustScore float64     `json:"trust_score"`
	Stats      PublicStats `json:"stats"`
}

type PublicStats struct {
	Impressions30d int `json:"impressions_30d"`
	Clicks30d      int `json:"clicks_30d"`
}

type PaginationInfo struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
	Total int `json:"total"`
}

func (s *Server) handleListDirectory() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		page, _ := strconv.Atoi(r.URL.Query().Get("page"))
		if page < 1 {
			page = 1
		}
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		if limit < 1 || limit > 100 {
			limit = 20
		}
		category := r.URL.Query().Get("category")

		var total int
		countQuery := `SELECT COUNT(*) FROM startups WHERE status IN ('active', 'pending')`
		countArgs := []any{}
		if category != "" {
			countQuery = `
				SELECT COUNT(*) FROM startups s
				JOIN startup_categories sc ON sc.startup_id = s.id
				JOIN categories c ON c.id = sc.category_id
				WHERE s.status IN ('active', 'pending') AND c.slug = $1`
			countArgs = append(countArgs, category)
		}
		s.db.Get(&total, countQuery, countArgs...)

		offset := (page - 1) * limit
		listQuery := `SELECT s.id, s.slug, s.name, s.one_line_pitch, COALESCE(s.logo_url, ''), s.created_at, s.trust_score, s.verified_traffic_tier, s.boost_level
			FROM startups s WHERE s.status IN ('active', 'pending')`
		listArgs := []any{}

		if category != "" {
			listQuery += ` AND EXISTS (
				SELECT 1 FROM startup_categories sc
				JOIN categories c ON c.id = sc.category_id
				WHERE sc.startup_id = s.id AND c.slug = ?)`
			listArgs = append(listArgs, category)
		}

		listQuery += ` ORDER BY s.boost_level DESC, s.created_at DESC LIMIT ? OFFSET ?`
		listArgs = append(listArgs, limit, offset)

		// Convert ? to $N for PostgreSQL
		listQuery = toDollarParam(listQuery)
		listArgsDollar := make([]any, len(listArgs))
		copy(listArgsDollar, listArgs)

		rows, err := s.db.Query(listQuery, listArgsDollar...)
		entries := []DirectoryEntry{}
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var e DirectoryEntry
				rows.Scan(&e.id, &e.Slug, &e.Name, &e.Pitch, &e.LogoURL, &e.JoinedAt, &e.TrustScore, &e.VerifiedTraffic, &e.BoostLevel)
				entries = append(entries, e)
			}
		}

		// Load categories for each entry
		for i := range entries {
			cats, err := loadCategories(s.db, entries[i].id)
			if err == nil && cats != nil {
				entries[i].Categories = cats
			} else {
				entries[i].Categories = []string{}
			}
		}

		writeOK(w, DirectoryResponse{
			Data: entries,
			Pagination: PaginationInfo{
				Page:  page,
				Limit: limit,
				Total: total,
			},
		})
	}
}

func (s *Server) handleDirectoryEntry() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		slug := chi.URLParam(r, "slug")

		var resp StartupProfileResponse
		var startupID, logoURL, createdAt string
		err := s.db.QueryRow(`
			SELECT id, slug, name, one_line_pitch, url, COALESCE(logo_url, ''), trust_score, created_at::text
			FROM startups WHERE slug = $1 AND status = 'active'
		`, slug).Scan(&startupID, &resp.Slug, &resp.Name, &resp.Pitch, &resp.URL, &logoURL, &resp.TrustScore, &createdAt)
		if err != nil {
			writeError(w, http.StatusNotFound, "startup not found")
			return
		}

		resp.LogoURL = logoURL
		resp.JoinedAt = createdAt
		if cats, err := loadCategories(s.db, startupID); err == nil && cats != nil {
			resp.Categories = cats
		}

		s.db.Get(&resp.Stats.Impressions30d, `
			SELECT COUNT(*) FROM impressions
			WHERE shown_startup_id = (SELECT id FROM startups WHERE slug = $1)
			AND timestamp >= NOW() - INTERVAL '30 days'`, slug)
		s.db.Get(&resp.Stats.Clicks30d, `
			SELECT COUNT(*) FROM clicks c
			JOIN impressions i ON i.id = c.impression_id
			WHERE i.shown_startup_id = (SELECT id FROM startups WHERE slug = $1)
			AND c.timestamp >= NOW() - INTERVAL '30 days'`, slug)

		writeOK(w, resp)
	}
}

func toDollarParam(q string) string {
	n := 0
	result := make([]byte, 0, len(q))
	for i := 0; i < len(q); i++ {
		if q[i] == '?' {
			n++
			result = append(result, []byte(fmt.Sprintf("$%d", n))...)
		} else {
			result = append(result, q[i])
		}
	}
	return string(result)
}
