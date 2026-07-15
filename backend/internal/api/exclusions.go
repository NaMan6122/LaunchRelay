package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type ExclusionRequest struct {
	ExcludedStartupID  string `json:"excluded_startup_id,omitempty"`
	ExcludedCategoryID string `json:"excluded_category_id,omitempty"`
}

type ExclusionResponse struct {
	ID                 string `json:"id"`
	ExcludedStartupID  string `json:"excluded_startup_id,omitempty"`
	ExcludedCategoryID string `json:"excluded_category_id,omitempty"`
}

func (s *Server) handleCreateExclusion() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		startupID := chi.URLParam(r, "id")

		var req ExclusionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if req.ExcludedStartupID == "" && req.ExcludedCategoryID == "" {
			writeError(w, http.StatusBadRequest, "must specify excluded_startup_id or excluded_category_id")
			return
		}
		if req.ExcludedStartupID != "" && req.ExcludedCategoryID != "" {
			writeError(w, http.StatusBadRequest, "specify only one of excluded_startup_id or excluded_category_id")
			return
		}

		var id string
		err := s.db.QueryRow(
			`INSERT INTO competitor_exclusions (startup_id, excluded_startup_id, excluded_category_id)
			 VALUES ($1, $2, $3)
			 RETURNING id`,
			startupID,
			nullIfEmpty(req.ExcludedStartupID),
			nullIfEmpty(req.ExcludedCategoryID),
		).Scan(&id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create exclusion")
			return
		}

		writeCreated(w, ExclusionResponse{
			ID:                 id,
			ExcludedStartupID:  req.ExcludedStartupID,
			ExcludedCategoryID: req.ExcludedCategoryID,
		})
	}
}

func (s *Server) handleListExclusions() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		startupID := chi.URLParam(r, "id")

		rows, err := s.db.Query(
			`SELECT id, COALESCE(excluded_startup_id::text, ''), COALESCE(excluded_category_id::text, '')
			 FROM competitor_exclusions WHERE startup_id = $1`, startupID,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list exclusions")
			return
		}
		defer rows.Close()

		exclusions := make([]ExclusionResponse, 0)
		for rows.Next() {
			var e ExclusionResponse
			if err := rows.Scan(&e.ID, &e.ExcludedStartupID, &e.ExcludedCategoryID); err != nil {
				continue
			}
			exclusions = append(exclusions, e)
		}

		writeOK(w, exclusions)
	}
}

func nullIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
