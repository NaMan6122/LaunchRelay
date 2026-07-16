package api

import (
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
	db     *sqlx.DB
	router *chi.Mux
	addr   string
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
	}

	s.registerRoutes()
	return s
}

func (s *Server) registerRoutes() {
	s.router.Get("/v1/health", s.handleHealth())

	// Auth routes
	s.router.Post("/v1/auth/magic-link", s.handleSendMagicLink())
	s.router.Post("/v1/auth/verify", s.handleVerifyMagicLink())

	// Rate-limited routes
	s.router.Group(func(r chi.Router) {
		r.Use(s.rateLimit)

		r.Get("/v1/match", s.handleMatch())
		r.Post("/v1/impressions", s.handleBatchImpressions())
		r.Post("/v1/clicks", s.handleClick())
	})

	// Startups
	s.router.Post("/v1/startups", s.handleCreateStartup())
	s.router.Get("/v1/startups/{id}", s.handleGetStartup())
	s.router.Patch("/v1/startups/{id}", s.handleUpdateStartup())

	// Categories
	s.router.Get("/v1/categories", s.handleListCategories())

	// Competitor exclusions
	s.router.Post("/v1/startups/{id}/exclusions", s.handleCreateExclusion())
	s.router.Get("/v1/startups/{id}/exclusions", s.handleListExclusions())

	// Trust score
	s.router.Get("/v1/startups/{id}/trust", s.handleTrustScore())

	// Dashboard API (JSON)
	s.router.Get("/v1/dashboard/{startup_id}", s.handleDashboard())

	// Public directory API (JSON)
	s.router.Get("/v1/directory", s.handleListDirectory())
	s.router.Get("/v1/directory/{slug}", s.handleDirectoryEntry())

	// Ledger (admin-triggered monthly computation)
	s.router.Post("/v1/admin/ledger/compute", s.handleComputeLedger())

	// HTML pages
	s.router.Get("/", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/directory", http.StatusFound)
	})
	s.router.Get("/dashboard/{startup_id}", s.handleDashboardHTML())
	s.router.Get("/directory/{slug}", s.handleProfileHTML())
	s.router.Get("/directory", s.handleDirectoryHTML())
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
