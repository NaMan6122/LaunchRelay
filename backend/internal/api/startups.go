package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

type StartupRequest struct {
	Name         string   `json:"name"`
	URL          string   `json:"url"`
	OneLinePitch string   `json:"one_line_pitch"`
	Categories   []string `json:"categories"`
	Email        string   `json:"email"`
}

type StartupResponse struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	URL       string   `json:"url"`
	Slug      string   `json:"slug"`
	Pitch     string   `json:"one_line_pitch"`
	Categories []string `json:"categories"`
	Status    string   `json:"status"`
	EmbedCode string   `json:"embed_code,omitempty"`
	CreatedAt string   `json:"created_at"`
}

type StartupUpdateRequest struct {
	Name         string   `json:"name,omitempty"`
	URL          string   `json:"url,omitempty"`
	OneLinePitch string   `json:"one_line_pitch,omitempty"`
	Categories   []string `json:"categories,omitempty"`
	Status       string   `json:"status,omitempty"`
}

var slugRegex = regexp.MustCompile(`[^a-z0-9-]`)

func toSlug(name string) string {
	s := strings.ToLower(name)
	s = strings.ReplaceAll(s, " ", "-")
	s = slugRegex.ReplaceAllString(s, "")
	return s
}

func generateEmbedCode(startupID string) string {
	return `<script src="https://cdn.launchrelay.com/widget.js" data-startup-id="` + startupID + `" async></script>`
}

func validURL(raw string) bool {
	u, err := url.ParseRequestURI(raw)
	if err != nil {
		return false
	}
	return u.Scheme == "http" || u.Scheme == "https"
}

func (s *Server) handleCreateStartup() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req StartupRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if req.Name == "" || req.URL == "" || req.OneLinePitch == "" || req.Email == "" {
			writeError(w, http.StatusBadRequest, "missing required fields: name, url, one_line_pitch, email")
			return
		}

		if !validURL(req.URL) {
			writeError(w, http.StatusBadRequest, "invalid URL: must be a valid http or https URL")
			return
		}

		if len(req.OneLinePitch) > 280 {
			writeError(w, http.StatusBadRequest, "one_line_pitch must be 280 characters or fewer")
			return
		}

		slug := toSlug(req.Name)

		var id string
		err := s.db.QueryRow(
			`INSERT INTO startups (name, url, slug, one_line_pitch, email, status)
			 VALUES ($1, $2, $3, $4, $5, 'active')
			 RETURNING id`,
			req.Name, req.URL, slug, req.OneLinePitch, req.Email,
		).Scan(&id)
		if err != nil && strings.Contains(err.Error(), "unique") {
			// Slug collision — append random suffix and retry once
			suffix := make([]byte, 3)
			rand.Read(suffix)
			slug = fmt.Sprintf("%s-%s", slug, hex.EncodeToString(suffix))
			err = s.db.QueryRow(
				`INSERT INTO startups (name, url, slug, one_line_pitch, email, status)
				 VALUES ($1, $2, $3, $4, $5, 'active')
				 RETURNING id`,
				req.Name, req.URL, slug, req.OneLinePitch, req.Email,
			).Scan(&id)
		}
		if err != nil {
			if strings.Contains(err.Error(), "unique") {
				writeError(w, http.StatusConflict, "a startup with this name already exists")
				return
			}
			writeError(w, http.StatusInternalServerError, "failed to create startup", err.Error())
			return
		}

		// Assign categories
		for _, catName := range req.Categories {
			var catID string
			err := s.db.QueryRow(`SELECT id FROM categories WHERE name = $1`, catName).Scan(&catID)
			if err != nil {
				continue // skip unknown categories
			}
			s.db.Exec(`INSERT INTO startup_categories (startup_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, id, catID)
		}

		// If the user is authenticated, link their session to this startup
		if authHeader := r.Header.Get("Authorization"); len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			hashed := hashToken(authHeader[7:])
			var tokenEmail string
			if err := s.db.Get(&tokenEmail, `SELECT email FROM auth_tokens WHERE token = $1 AND expires_at > NOW()`, hashed); err == nil {
				s.db.Exec(`UPDATE auth_tokens SET startup_id = $1 WHERE email = $2 AND startup_id IS NULL`, id, tokenEmail)
			}
		}

		writeCreated(w, StartupResponse{
			ID:        id,
			Name:      req.Name,
			URL:       req.URL,
			Slug:      slug,
			Pitch:     req.OneLinePitch,
			Categories: req.Categories,
			Status:    "active",
			EmbedCode: generateEmbedCode(id),
			CreatedAt: time.Now().UTC().Format(time.RFC3339),
		})
	}
}

func (s *Server) handleUpdateStartup() func(http.ResponseWriter, *http.Request, string) {
	return func(w http.ResponseWriter, r *http.Request, id string) {
		var req StartupUpdateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		hasChanges := false

		// Validate and build update query
		if req.Status != "" {
			validStatuses := map[string]bool{
				"pending": true, "active": true, "paused": true, "delisted": true, "rejected": true,
			}
			if !validStatuses[req.Status] {
				writeError(w, http.StatusBadRequest, "invalid status: must be one of pending, active, paused, delisted, rejected")
				return
			}
			s.db.Exec(`UPDATE startups SET status = $1, updated_at = NOW() WHERE id = $2`, req.Status, id)
			hasChanges = true
		}

		if req.Name != "" {
			if len(req.Name) > 255 {
				writeError(w, http.StatusBadRequest, "name must be 255 characters or fewer")
				return
			}
			slug := toSlug(req.Name)
			// Handle slug collision by appending random suffix
			result, err := s.db.Exec(
				`UPDATE startups SET name = $1, slug = $2, updated_at = NOW() WHERE id = $3`,
				req.Name, slug, id,
			)
			if err != nil && strings.Contains(err.Error(), "unique") {
				suffix := make([]byte, 3)
				rand.Read(suffix)
				slug = fmt.Sprintf("%s-%s", slug, hex.EncodeToString(suffix))
				_, err = s.db.Exec(
					`UPDATE startups SET name = $1, slug = $2, updated_at = NOW() WHERE id = $3`,
					req.Name, slug, id,
				)
			}
			if err != nil {
				writeError(w, http.StatusInternalServerError, "failed to update name")
				return
			}
			_ = result
			hasChanges = true
		}

		if req.URL != "" {
			if !validURL(req.URL) {
				writeError(w, http.StatusBadRequest, "invalid URL: must be a valid http or https URL")
				return
			}
			s.db.Exec(`UPDATE startups SET url = $1, updated_at = NOW() WHERE id = $2`, req.URL, id)
			hasChanges = true
		}

		if req.OneLinePitch != "" {
			if len(req.OneLinePitch) > 280 {
				writeError(w, http.StatusBadRequest, "one_line_pitch must be 280 characters or fewer")
				return
			}
			s.db.Exec(`UPDATE startups SET one_line_pitch = $1, updated_at = NOW() WHERE id = $2`, req.OneLinePitch, id)
			hasChanges = true
		}

		if req.Categories != nil {
			s.db.Exec(`DELETE FROM startup_categories WHERE startup_id = $1`, id)
			for _, catName := range req.Categories {
				var catID string
				err := s.db.QueryRow(`SELECT id FROM categories WHERE name = $1`, catName).Scan(&catID)
				if err != nil {
					continue
				}
				s.db.Exec(`INSERT INTO startup_categories (startup_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, id, catID)
			}
			hasChanges = true
		}

		if !hasChanges {
			writeError(w, http.StatusBadRequest, "no fields to update")
			return
		}

		writeOK(w, map[string]string{"status": "updated"})
	}
}

func (s *Server) handleGetStartup() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")

		var resp StartupResponse
		var logoURL *string
		var createdAt time.Time
		err := s.db.QueryRow(
			`SELECT id, name, url, slug, one_line_pitch, logo_url, status, created_at
			 FROM startups WHERE id = $1`, id,
		).Scan(&resp.ID, &resp.Name, &resp.URL, &resp.Slug, &resp.Pitch, &logoURL, &resp.Status, &createdAt)
		if err != nil {
			writeError(w, http.StatusNotFound, "startup not found")
			return
		}

		// Load categories
		rows, err := s.db.Query(
			`SELECT c.name FROM startup_categories sc
			 JOIN categories c ON c.id = sc.category_id
			 WHERE sc.startup_id = $1`, id,
		)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var cat string
				rows.Scan(&cat)
				resp.Categories = append(resp.Categories, cat)
			}
		}

		resp.CreatedAt = createdAt.Format(time.RFC3339)
		resp.EmbedCode = generateEmbedCode(resp.ID)

		writeOK(w, resp)
	}
}


