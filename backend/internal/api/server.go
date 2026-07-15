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

	// Startups
	s.router.Post("/v1/startups", s.handleCreateStartup())
	s.router.Get("/v1/startups/{id}", s.handleGetStartup())
	s.router.Patch("/v1/startups/{id}", s.handleUpdateStartup())

	// Categories
	s.router.Get("/v1/categories", s.handleListCategories())

	// Competitor exclusions
	s.router.Post("/v1/startups/{id}/exclusions", s.handleCreateExclusion())
	s.router.Get("/v1/startups/{id}/exclusions", s.handleListExclusions())

	// Matching
	s.router.Get("/v1/match", s.handleMatch())

	// Ledger (admin-triggered monthly computation)
	s.router.Post("/v1/admin/ledger/compute", s.handleComputeLedger())
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
