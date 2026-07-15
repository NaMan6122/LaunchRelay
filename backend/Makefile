.PHONY: all run migrate test lint docker-up docker-down

APP_NAME := launchrelay-api
DB_URL := postgres://launchrelay:launchrelay_dev@localhost:5432/launchrelay?sslmode=disable

all: run

docker-up:
	docker compose up -d

docker-down:
	docker compose down

migrate-up:
	@echo "Running migrations..."
	migrate -path internal/db/migrations -database "$(DB_URL)" up

migrate-down:
	@echo "Rolling back migrations..."
	migrate -path internal/db/migrations -database "$(DB_URL)" down 1

migrate-reset:
	@echo "Resetting database..."
	migrate -path internal/db/migrations -database "$(DB_URL)" drop
	migrate -path internal/db/migrations -database "$(DB_URL)" up

test:
	go test ./... -count=1 -v

run:
	go run ./cmd/api/

build:
	go build -o bin/$(APP_NAME) ./cmd/api/

lint:
	golangci-lint run ./...
