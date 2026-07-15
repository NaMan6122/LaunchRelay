package api

import (
	"net/http"
)

type CategoryResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description,omitempty"`
}

func (s *Server) handleListCategories() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := s.db.Query(
			`SELECT id, name, slug, COALESCE(description, '') FROM categories ORDER BY name`,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list categories")
			return
		}
		defer rows.Close()

		categories := make([]CategoryResponse, 0)
		for rows.Next() {
			var c CategoryResponse
			if err := rows.Scan(&c.ID, &c.Name, &c.Slug, &c.Description); err != nil {
				continue
			}
			categories = append(categories, c)
		}

		writeOK(w, categories)
	}
}
