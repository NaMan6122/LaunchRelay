#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { printf "${GREEN}[%s]${NC} %s\n" "$1" "$2"; }
warn()  { printf "${YELLOW}[%s]${NC} %s\n" "WARN" "$1"; }
err()   { printf "${RED}[%s]${NC} %s\n" "ERR" "$1"; exit 1; }

cleanup() {
  info "DEV" "Shutting down..."
  cd "$ROOT/backend" && docker compose down 2>/dev/null
}
trap cleanup EXIT

kill_existing() {
  local pid
  pid=$(lsof -ti :8080 2>/dev/null)
  if [ -n "$pid" ]; then
    warn "Port 8080 in use by PID $pid — killing..."
    kill "$pid" 2>/dev/null && sleep 1
  fi
}

info "DEV" "Starting LaunchRelay dev environment"

# ── Check prerequisites ──────────────────────────────────────────
command -v docker >/dev/null 2>&1 || err "docker is required"
command -v psql  >/dev/null 2>&1 || warn "psql not found — PostgreSQL checks will be limited"
if ! command -v migrate >/dev/null 2>&1; then
  warn "migrate CLI not found (golang-migrate). Install it:"
  warn "  brew install golang-migrate"
  warn "  or: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"
  warn "Continuing without migration step..."
  SKIP_MIGRATE=1
fi

# ── 1. Start PostgreSQL ─────────────────────────────────────────
info "1/4" "Starting PostgreSQL..."
cd "$ROOT/backend" && docker compose up -d

info "1/4" "Waiting for PostgreSQL to be healthy..."
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U launchrelay >/dev/null 2>&1; then
    info "1/4" "PostgreSQL is ready"
    break
  fi
  if [ "$i" -eq 30 ]; then
    err "PostgreSQL failed to start within 30s"
  fi
  sleep 1
done

# ── 2. Run migrations ────────────────────────────────────────────
if [ -z "$SKIP_MIGRATE" ]; then
  info "2/4" "Running database migrations..."
  cd "$ROOT/backend" && make migrate-up 2>&1 || warn "Migration step had issues — DB may already be up-to-date"
else
  info "2/4" "Skipping migrations (migrate CLI not found)"
fi

# ── 3. Kill stale backend ────────────────────────────────────────
kill_existing

# ── 4. Print useful info ─────────────────────────────────────────
info "3/4" "Starting API server"
echo ""
printf "  ${GREEN}API:${NC}      http://localhost:8080\n"
printf "  ${GREEN}Health:${NC}   http://localhost:8080/v1/health\n"
printf "  ${GREEN}Frontend:${NC} http://localhost:5173 (run 'cd webapp && npx vite' separately)\n"
printf "  ${GREEN}DB:${NC}       postgres://launchrelay:launchrelay_dev@localhost:5432/launchrelay\n"
echo ""

# ── 5. Start API server ──────────────────────────────────────────
info "4/4" "Running go run ./cmd/api/ ..."
cd "$ROOT/backend" && go run ./cmd/api/
