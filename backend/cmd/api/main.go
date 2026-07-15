package main

import (
	"log"

	"github.com/launchrelay/backend/internal/api"
	"github.com/launchrelay/backend/internal/db"
)

func main() {
	cfg := db.ConfigFromEnv()
	database, err := db.Connect(cfg)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer database.Close()

	server := api.New(database)
	log.Printf("launchrelay api starting...")

	if err := server.Start(); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
