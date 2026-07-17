package api

import (
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jmoiron/sqlx"
)

type Server struct {
	db      *sqlx.DB
	router  *chi.Mux
	addr    string
	mailer  EmailSender
}

func New(db *sqlx.DB) *Server {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Timeout(30))

	s := &Server{
		db:     db,
		router: r,
		addr:   getAddr(),
		mailer: NewEmailSender(),
	}

	s.registerRoutes()
	return s
}

func (s *Server) registerRoutes() {
	s.router.Get("/v1/health", s.handleHealth())

	// Auth routes (public)
	s.router.Post("/v1/auth/magic-link", s.handleSendMagicLink())
	s.router.Post("/v1/auth/verify", s.handleVerifyMagicLink())

	// Auth routes (protected - requires valid session)
	s.router.Group(func(r chi.Router) {
		r.Use(s.authMiddleware)
		r.Post("/v1/auth/logout", s.handleLogout())
	})

	// Rate-limited routes
	s.router.Group(func(r chi.Router) {
		r.Use(s.rateLimit)

		r.Get("/v1/match", s.handleMatch())
		r.Post("/v1/impressions", s.handleBatchImpressions())
		r.Post("/v1/clicks", s.handleClick())
	})

	// Startups (public)
	s.router.Post("/v1/startups", s.handleCreateStartup())
	s.router.Get("/v1/startups/{id}", s.handleGetStartup())

	// Categories (public)
	s.router.Get("/v1/categories", s.handleListCategories())

	// Public directory API (JSON)
	s.router.Get("/v1/directory", s.handleListDirectory())
	s.router.Get("/v1/directory/{slug}", s.handleDirectoryEntry())

	// Trust score (semi-public — needed for the directory display)
	s.router.Get("/v1/startups/{id}/trust", s.handleTrustScore())

	// Protected startup routes — require auth + ownership
	s.router.Group(func(r chi.Router) {
		r.Use(s.authMiddleware)

		r.Patch("/v1/startups/{id}", s.requireOwnership(s.handleUpdateStartup()))
		r.Post("/v1/startups/{id}/exclusions", s.requireOwnership(s.handleCreateExclusion()))
		r.Get("/v1/startups/{id}/exclusions", s.requireOwnership(s.handleListExclusions()))
		r.Delete("/v1/startups/{id}/exclusions/{exclusion_id}", s.requireOwnership(s.handleDeleteExclusion()))
		r.Post("/v1/startups/{id}/verify-traffic", s.requireOwnership(s.handleVerifyTraffic()))
		r.Post("/v1/startups/{id}/webhooks", s.requireOwnership(s.handleCreateWebhook()))
		r.Get("/v1/startups/{id}/webhooks", s.requireOwnership(s.handleListWebhooks()))
		r.Delete("/v1/startups/{id}/webhooks/{webhook_id}", s.requireOwnership(s.handleDeleteWebhook()))
		r.Get("/v1/dashboard/{startup_id}", s.requireOwnership(s.handleDashboard()))
		r.Get("/v1/startups/{id}/embeds", s.requireOwnership(s.handleListEmbeds()))
		r.Patch("/v1/startups/{id}/embeds/{embed_id}", s.requireOwnership(s.handleUpdateEmbed()))
	})

	// Ledger (admin-only — requires ADMIN_KEY env var)
	s.router.Post("/v1/admin/ledger/compute", s.adminMiddleware(s.handleComputeLedger()))

	// SEO
	s.router.Get("/robots.txt", s.handleRobotsTxt())
	s.router.Get("/sitemap.xml", s.handleSitemapXML())

	// Static assets (Vite build output)
	staticFS, err := fs.Sub(staticAssets, ".")
	if err == nil {
		s.router.Handle("/static/*", http.StripPrefix("/static/", http.FileServer(http.FS(staticFS))))
	}

	// SDK files
	sdkFS, err := fs.Sub(staticAssets, "sdk")
	if err == nil {
		s.router.Get("/sdk/widget.js", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
			w.Header().Set("Cache-Control", "public, max-age=86400")
			http.ServeFileFS(w, r, sdkFS, "widget.js")
		})
		s.router.Get("/sdk/pixel.js", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
			w.Header().Set("Cache-Control", "public, max-age=86400")
			http.ServeFileFS(w, r, sdkFS, "pixel.js")
		})
	}

	// Server-rendered directory pages (SEO) — must be before catch-all
	s.router.Get("/directory", s.handleDirectoryHTML())
	s.router.Get("/directory/{slug}", s.handleProfileHTML())

	// React SPA — serves the unified frontend for all UI routes
	reactShell := s.handleReactShell("", "")
	s.router.Get("/", reactShell)
	s.router.Get("/about", reactShell)
	s.router.Get("/login", s.handleReactShell("login", ""))
	s.router.Get("/apply", s.handleReactShell("apply", ""))
	s.router.Get("/dashboard/{startup_id}", func(w http.ResponseWriter, r *http.Request) {
		s.handleReactShell("dashboard", chi.URLParam(r, "startup_id"))(w, r)
	})
	// SPA catch-all for all other client-side routes
	s.router.Get("/*", reactShell)
}

func (s *Server) Start() error {
	log.Printf("starting server on %s", s.addr)

	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig
		log.Println("shutting down...")
	}()

	return http.ListenAndServe(s.addr, s.router)
}

func getAddr() string {
	if v := os.Getenv("ADDR"); v != "" {
		return v
	}
	return ":8080"
}
