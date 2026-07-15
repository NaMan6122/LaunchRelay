package api

import (
	"embed"
	"fmt"
	"html/template"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

//go:embed templates/*.html
var templateFS embed.FS

type DashboardPageData struct {
	StartupName        string
	StartupID          string
	HasImpressions     bool
	Impressions7d      int
	Clicks7d           int
	CTR                float64
	ReciprocityBalance int
	ImpressionsGiven   int
	ImpressionsReceived int
	TrustScore          float64
	Status              string
	LastVerifiedAt      string
	RecentMatches       []RecentMatchData
	EmbedCode           string
}

type RecentMatchData struct {
	Name        string
	Slug        string
	Impressions int
	Clicks      int
}

type DirectoryPageData struct {
	Entries    []DirectoryEntryData
	Categories []string
	Category   string
	Page       int
	TotalPages int
}

type DirectoryEntryData struct {
	Name       string
	Slug       string
	Pitch      string
	Categories []string
}

type ProfilePageData struct {
	Name          string
	Slug          string
	Pitch         string
	URL           string
	Categories    []string
	JoinedAt      string
	TrustScore    float64
	Impressions30d int
	Clicks30d     int
	CTR           float64
}

func (s *Server) loadTemplates() *template.Template {
	funcMap := template.FuncMap{
		"initial": func(s string) string {
			if s == "" {
				return "?"
			}
			return strings.ToUpper(string(s[0]))
		},
		"add": func(a, b int) int { return a + b },
		"sub": func(a, b int) int { return a - b },
	}

	tmpl, err := template.New("").Funcs(funcMap).ParseFS(templateFS, "templates/*.html")
	if err != nil {
		panic(fmt.Sprintf("load templates: %v", err))
	}
	return tmpl
}

func (s *Server) handleDashboardHTML() http.HandlerFunc {
	tmpl := s.loadTemplates()

	return func(w http.ResponseWriter, r *http.Request) {
		startupID := chi.URLParam(r, "startup_id")

		var name, status string
		var trustScore float64
		err := s.db.QueryRow(
			`SELECT name, status, trust_score FROM startups WHERE id = $1`, startupID,
		).Scan(&name, &status, &trustScore)
		if err != nil {
			writeError(w, http.StatusNotFound, "startup not found")
			return
		}

		sevenDaysAgo := time.Now().UTC().AddDate(0, 0, -7)
		data := DashboardPageData{
			StartupName: name,
			StartupID:   startupID,
			Status:      status,
			TrustScore:  trustScore,
			EmbedCode:   generateEmbedCode(startupID),
		}

		s.db.Get(&data.Impressions7d, `
			SELECT COUNT(*) FROM impressions
			WHERE viewer_startup_id = $1 AND timestamp >= $2
		`, startupID, sevenDaysAgo)

		s.db.Get(&data.Clicks7d, `
			SELECT COUNT(*) FROM clicks c
			JOIN impressions i ON i.id = c.impression_id
			WHERE i.viewer_startup_id = $1 AND c.timestamp >= $2
		`, startupID, sevenDaysAgo)

		if data.Impressions7d > 0 {
			data.HasImpressions = true
			data.CTR = float64(data.Clicks7d) / float64(data.Impressions7d) * 100
		}

		s.db.Get(&data.ReciprocityBalance, `
			SELECT COALESCE(balance, 0) FROM reciprocity_ledger
			WHERE startup_id = $1 ORDER BY period_start DESC LIMIT 1
		`, startupID)
		s.db.Get(&data.ImpressionsGiven, `
			SELECT COALESCE(impressions_given, 0) FROM reciprocity_ledger
			WHERE startup_id = $1 ORDER BY period_start DESC LIMIT 1
		`, startupID)
		s.db.Get(&data.ImpressionsReceived, `
			SELECT COALESCE(impressions_received, 0) FROM reciprocity_ledger
			WHERE startup_id = $1 ORDER BY period_start DESC LIMIT 1
		`, startupID)

		var lastVerified time.Time
		s.db.Get(&lastVerified, `
			SELECT COALESCE(MAX(last_verified_at), '1970-01-01'::timestamptz)
			FROM embed_instances WHERE startup_id = $1
		`, startupID)
		if lastVerified.Year() > 1970 {
			data.LastVerifiedAt = lastVerified.Format("Jan 2, 2006")
		}

		rows, err := s.db.Query(`
			SELECT s.name, s.slug, COUNT(*) as impressions,
			       (SELECT COUNT(*) FROM clicks c WHERE c.impression_id = i.id) as clicks
			FROM impressions i
			JOIN startups s ON s.id = i.shown_startup_id
			WHERE i.viewer_startup_id = $1 AND i.timestamp >= $2
			GROUP BY s.name, s.slug, i.id
			ORDER BY impressions DESC LIMIT 10
		`, startupID, sevenDaysAgo)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var m RecentMatchData
				rows.Scan(&m.Name, &m.Slug, &m.Impressions, &m.Clicks)
				data.RecentMatches = append(data.RecentMatches, m)
			}
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		tmpl.ExecuteTemplate(w, "layout.html", data)
	}
}

func (s *Server) handleDirectoryHTML() http.HandlerFunc {
	tmpl := s.loadTemplates()

	return func(w http.ResponseWriter, r *http.Request) {
		page, _ := strconv.Atoi(r.URL.Query().Get("page"))
		if page < 1 {
			page = 1
		}
		limit := 12
		category := r.URL.Query().Get("category")

		data := DirectoryPageData{
			Page:     page,
			Category: category,
		}

		// Load categories for filter
		catRows, _ := s.db.Query(`SELECT slug FROM categories ORDER BY name`)
		if catRows != nil {
			defer catRows.Close()
			for catRows.Next() {
				var c string
				catRows.Scan(&c)
				data.Categories = append(data.Categories, c)
			}
		}

		// Count total
		countQuery := `SELECT COUNT(*) FROM startups WHERE status = 'active'`
		countArgs := []any{}
		if category != "" {
			countQuery += ` AND EXISTS (
				SELECT 1 FROM startup_categories sc
				JOIN categories c ON c.id = sc.category_id
				WHERE sc.startup_id = startups.id AND c.slug = $1)`
			countArgs = append(countArgs, category)
		}
		var total int
		s.db.Get(&total, countQuery, countArgs...)
		totalPages := (total + limit - 1) / limit
		if totalPages < 1 {
			totalPages = 1
		}
		data.TotalPages = totalPages

		// Load entries
		listQuery := `SELECT s.id, s.slug, s.name, s.one_line_pitch FROM startups s WHERE s.status = 'active'`
		listArgs := []any{}
		if category != "" {
			listQuery += ` AND EXISTS (
				SELECT 1 FROM startup_categories sc
				JOIN categories c ON c.id = sc.category_id
				WHERE sc.startup_id = s.id AND c.slug = $1)`
			listArgs = append(listArgs, category)
		}
		listQuery += ` ORDER BY s.created_at DESC LIMIT $2 OFFSET $3`
		listArgs = append(listArgs, limit, (page-1)*limit)

		// Convert to dollar params
		listQuery = toDollarParam(listQuery)
		listArgsDollar := make([]any, len(listArgs))
		copy(listArgsDollar, listArgs)

		rows, err := s.db.Query(listQuery, listArgsDollar...)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var id string
				var e DirectoryEntryData
				rows.Scan(&id, &e.Slug, &e.Name, &e.Pitch)
				e.Categories, _ = loadCategories(s.db, id)
				data.Entries = append(data.Entries, e)
			}
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		tmpl.ExecuteTemplate(w, "layout.html", data)
	}
}

func (s *Server) handleProfileHTML() http.HandlerFunc {
	tmpl := s.loadTemplates()

	return func(w http.ResponseWriter, r *http.Request) {
		slug := chi.URLParam(r, "slug")

		data := ProfilePageData{}

		var startupID string
		err := s.db.QueryRow(`
			SELECT id, slug, name, one_line_pitch, url, trust_score, created_at::text
			FROM startups WHERE slug = $1 AND status = 'active'
		`, slug).Scan(&startupID, &data.Slug, &data.Name, &data.Pitch, &data.URL, &data.TrustScore, &data.JoinedAt)
		if err != nil {
			http.NotFound(w, r)
			return
		}

		data.Categories, _ = loadCategories(s.db, startupID)

		joined, _ := time.Parse("2006-01-02T15:04:05Z07:00", data.JoinedAt)
		if joined.Year() <= 1 {
			joined, _ = time.Parse("2006-01-02T15:04:05", data.JoinedAt)
		}
		if joined.Year() > 1 {
			data.JoinedAt = joined.Format("Jan 2, 2006")
		}

		s.db.Get(&data.Impressions30d, `
			SELECT COUNT(*) FROM impressions
			WHERE shown_startup_id = (SELECT id FROM startups WHERE slug = $1)
			AND timestamp >= NOW() - INTERVAL '30 days'`, slug)
		s.db.Get(&data.Clicks30d, `
			SELECT COUNT(*) FROM clicks c
			JOIN impressions i ON i.id = c.impression_id
			WHERE i.shown_startup_id = (SELECT id FROM startups WHERE slug = $1)
			AND c.timestamp >= NOW() - INTERVAL '30 days'`, slug)

		if data.Impressions30d > 0 {
			data.CTR = float64(data.Clicks30d) / float64(data.Impressions30d) * 100
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		tmpl.ExecuteTemplate(w, "layout.html", data)
	}
}
