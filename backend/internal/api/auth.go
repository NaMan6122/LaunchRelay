package api

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
)

type contextKey string

const UserEmailKey contextKey = "userEmail"

type MagicLinkRequest struct {
	Email string `json:"email"`
}

type MagicLinkResponse struct {
	Sent  bool   `json:"sent"`
	Debug string `json:"debug,omitempty"` // In dev, returns the magic link URL
}

type VerifyRequest struct {
	Token string `json:"token"`
}

type VerifyResponse struct {
	Token     string  `json:"token"`
	Email     string  `json:"email"`
	StartupID *string `json:"startup_id,omitempty"`
}

func generateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

func (s *Server) handleSendMagicLink() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req MagicLinkRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.Email == "" {
			writeError(w, http.StatusBadRequest, "email is required")
			return
		}

		token := generateToken()
		hashed := hashToken(token)

		_, err := s.db.Exec(`
			INSERT INTO magic_link_tokens (email, token, expires_at)
			VALUES ($1, $2, NOW() + INTERVAL '15 minutes')
		`, req.Email, hashed)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create token")
			return
		}

		devMode := os.Getenv("DEV_MODE") != "false"
		resp := MagicLinkResponse{Sent: true}

		if devMode {
			debugPath := "/login?token=" + token
			resp.Debug = debugPath
			log.Printf("[dev] magic link for %s: %s", req.Email, debugPath)
		} else {
			appURL := os.Getenv("APP_URL")
			if appURL == "" {
				appURL = "https://launchrelay.com"
			}
			link := appURL + "/login?token=" + token
			if err := s.mailer.SendMagicLink(req.Email, link); err != nil {
				log.Printf("failed to send email to %s: %v", req.Email, err)
				writeError(w, http.StatusInternalServerError, "failed to send email")
				return
			}
		}

		writeOK(w, resp)
	}
}

func (s *Server) handleVerifyMagicLink() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req VerifyRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.Token == "" {
			writeError(w, http.StatusBadRequest, "token is required")
			return
		}

		hashed := hashToken(req.Token)

		var email string
		var expiresAt time.Time
		var used bool
		err := s.db.QueryRow(`
			SELECT email, expires_at, used FROM magic_link_tokens
			WHERE token = $1
		`, hashed).Scan(&email, &expiresAt, &used)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "invalid token")
			return
		}

		if used {
			writeError(w, http.StatusUnauthorized, "token already used")
			return
		}

		if time.Now().UTC().After(expiresAt) {
			writeError(w, http.StatusUnauthorized, "token expired")
			return
		}

		// Mark token as used
		s.db.Exec(`UPDATE magic_link_tokens SET used = true WHERE token = $1`, hashed)

		// Create auth session token (valid for 30 days)
		sessionToken := generateToken()
		sessionHashed := hashToken(sessionToken)

		// Check if email has a startup
		var startupID *string
		var sid string
		err = s.db.Get(&sid, `SELECT id FROM startups WHERE email = $1`, email)
		if err == nil {
			startupID = &sid
		}

		_, err = s.db.Exec(`
			INSERT INTO auth_tokens (email, startup_id, token, expires_at)
			VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')
		`, email, startupID, sessionHashed)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create session")
			return
		}

		writeOK(w, VerifyResponse{
			Token:     sessionToken,
			Email:     email,
			StartupID: startupID,
		})
	}
}

func (s *Server) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"error":"authorization required"}`, http.StatusUnauthorized)
			return
		}

		if len(authHeader) < 7 || authHeader[:7] != "Bearer " {
			http.Error(w, `{"error":"invalid authorization format"}`, http.StatusUnauthorized)
			return
		}

		token := authHeader[7:]
		hashed := hashToken(token)

		var email string
		var expiresAt time.Time
		err := s.db.QueryRow(`
			SELECT email, expires_at FROM auth_tokens
			WHERE token = $1 AND expires_at > NOW()
		`, hashed).Scan(&email, &expiresAt)
		if err != nil {
			http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), UserEmailKey, email)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func getUserEmail(r *http.Request) string {
	email, _ := r.Context().Value(UserEmailKey).(string)
	return email
}

func (s *Server) requireOwnership(next func(http.ResponseWriter, *http.Request, string)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		email := getUserEmail(r)
		if email == "" {
			writeError(w, http.StatusUnauthorized, "authorization required")
			return
		}

		startupID := chi.URLParam(r, "id")
		if startupID == "" {
			startupID = chi.URLParam(r, "startup_id")
		}

		var ownerEmail string
		err := s.db.Get(&ownerEmail, `SELECT email FROM startups WHERE id = $1`, startupID)
		if err != nil {
			writeError(w, http.StatusNotFound, "startup not found")
			return
		}

		if ownerEmail != email {
			writeError(w, http.StatusForbidden, "you do not own this startup")
			return
		}

		next(w, r, startupID)
	}
}

func (s *Server) adminMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		adminKey := os.Getenv("ADMIN_KEY")
		if adminKey == "" {
			writeError(w, http.StatusForbidden, "admin access not configured")
			return
		}

		authHeader := r.Header.Get("Authorization")
		if len(authHeader) < 7 || authHeader[:7] != "Bearer " || authHeader[7:] != adminKey {
			writeError(w, http.StatusForbidden, "invalid admin key")
			return
		}

		next(w, r)
	}
}

func (s *Server) handleLogout() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if len(authHeader) < 7 || authHeader[:7] != "Bearer " {
			writeError(w, http.StatusUnauthorized, "authorization required")
			return
		}

		token := authHeader[7:]
		hashed := hashToken(token)

		_, err := s.db.Exec(`DELETE FROM auth_tokens WHERE token = $1`, hashed)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to logout")
			return
		}

		writeOK(w, map[string]bool{"logged_out": true})
	}
}
