package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

type EmbedInstance struct {
	ID          string `json:"id" db:"id"`
	StartupID   string `json:"startup_id" db:"startup_id"`
	HostDomain  string `json:"host_domain" db:"host_domain"`
	Format      string `json:"widget_format" db:"widget_format"`
	Theme       string `json:"widget_theme" db:"widget_theme"`
	Position    string `json:"widget_position" db:"widget_position"`
	NoBranding  bool   `json:"no_branding" db:"no_branding"`
	Status      string `json:"status" db:"status"`
	LastVerified string `json:"last_verified_at" db:"last_verified_at"`
}

type EmbedUpdateRequest struct {
	Format     *string `json:"widget_format,omitempty"`
	Theme      *string `json:"widget_theme,omitempty"`
	Position   *string `json:"widget_position,omitempty"`
	NoBranding *bool   `json:"no_branding,omitempty"`
}

func (s *Server) handleListEmbeds() func(http.ResponseWriter, *http.Request, string) {
	return func(w http.ResponseWriter, r *http.Request, startupID string) {
		var embeds []EmbedInstance
		err := s.db.Select(&embeds, `
			SELECT id, startup_id, host_domain, widget_format, widget_theme, widget_position, no_branding, status, last_verified_at::text
			FROM embed_instances WHERE startup_id = $1
			ORDER BY status, host_domain
		`, startupID)
		if err != nil {
			embeds = []EmbedInstance{}
		}
		writeOK(w, embeds)
	}
}

func (s *Server) handleUpdateEmbed() func(http.ResponseWriter, *http.Request, string) {
	return func(w http.ResponseWriter, r *http.Request, startupID string) {
		embedID := chi.URLParam(r, "embed_id")

		var req EmbedUpdateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		if req.Format != nil {
			valid := map[string]bool{"bar": true, "badge": true, "card": true}
			if !valid[*req.Format] {
				writeError(w, http.StatusBadRequest, "invalid format: must be bar, badge, or card")
				return
			}
			s.db.Exec(`UPDATE embed_instances SET widget_format = $1 WHERE id = $2 AND startup_id = $3`, *req.Format, embedID, startupID)
		}
		if req.Theme != nil {
			valid := map[string]bool{"light": true, "dark": true}
			if !valid[*req.Theme] {
				writeError(w, http.StatusBadRequest, "invalid theme: must be light or dark")
				return
			}
			s.db.Exec(`UPDATE embed_instances SET widget_theme = $1 WHERE id = $2 AND startup_id = $3`, *req.Theme, embedID, startupID)
		}
		if req.Position != nil {
			valid := map[string]bool{"top": true, "bottom": true}
			if !valid[*req.Position] {
				writeError(w, http.StatusBadRequest, "invalid position: must be top or bottom")
				return
			}
			s.db.Exec(`UPDATE embed_instances SET widget_position = $1 WHERE id = $2 AND startup_id = $3`, *req.Position, embedID, startupID)
		}
		if req.NoBranding != nil {
			s.db.Exec(`UPDATE embed_instances SET no_branding = $1 WHERE id = $2 AND startup_id = $3`, *req.NoBranding, embedID, startupID)
		}

		writeOK(w, map[string]string{"status": "updated"})
	}
}
