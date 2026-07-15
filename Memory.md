# Agent Memory

## Session Summary
Last Session: 2026-07-16
Active Task: Phase 1 MVP complete — all specs implemented
Last File Touched: server.go
Immediate Next Step: Await next direction (testing, deployment, Phase 2 features)

## Active Task
_(none — all Phase 1 specs implemented)_

## Task Log
### 2026-07-16 — T-000: Project scaffolding
**State:** DONE
**Outcome:** Scaffolding created. Two Phase 0 specs approved at G1.
**Test Evidence:** N/A — scaffolding

### 2026-07-16 — T-001: Embed SDK Prototype
**State:** DONE
**Outcome:** SDK prototype complete. Bundle 2.2KB gzipped. 6/6 Playwright tests passing.
**Test Evidence:** sdk/test/verify.spec.mjs — 6 tests passing

### 2026-07-16 — T-002: Matching & Reciprocity Scoring Prototype
**State:** DONE
**Outcome:** Go scoring + ledger implemented. 17/17 unit tests passing.
**Test Evidence:** `go test ./internal/...` — 17 tests passing

### 2026-07-16 — T-005: Matching & Ledger Service
**State:** DONE
**Outcome:** Real match endpoint with DB queries, scoring, cache, and admin ledger computation implemented. 5 match endpoint tests passing.
**Test Evidence:** `go test ./internal/api/...` — 5 tests passing

### 2026-07-16 — T-006: Embed SDK Production
**State:** DONE
**Outcome:** SDK production upgrade with real API calls, 3 formats (bar/badge/card), dark theme, HMAC auth, UTM tagging, 204 handling, beacon tracking. 12/12 Playwright tests.
**Test Evidence:** sdk/test/verify.spec.mjs — 12 tests passing

### 2026-07-16 — T-007: Analytics & Dashboard API
**State:** DONE
**Outcome:** POST /v1/impressions (batch, idempotent), POST /v1/clicks (max 1/impression), GET /v1/dashboard/:id (7d KPIs, reciprocity, matches, trust), GET /v1/directory + /v1/directory/:slug (public, paginated). SDK beacon format updated to include shown_startup_id.
**Test Evidence:** `go test ./internal/api/...` — all tests pass

### 2026-07-16 — T-008: Trust & Fraud Layer
**State:** DONE
**Outcome:** GET /v1/startups/:id/trust (baseline + domain age + pass rate + flag adjustments), rate limiting middleware (10/min match, 60/min impressions, 30/min clicks).
**Test Evidence:** `go build ./...` clean

### 2026-07-16 — T-009: Dashboard & Directory HTML UI
**State:** DONE
**Outcome:** Server-rendered Go HTML templates for dashboard (KPI grid, match history, trust status, embed code), directory (paginated grid with category filter), and startup profile (30d stats, trust score). Embedded with go:embed. Routes: /, /dashboard/{id}, /directory, /directory/{slug}. Dev script scripts/dev.sh for one-command startup.
**Test Evidence:** `go build ./...` clean, `go test ./...` all pass, SDK 12/12 pass

## Self-Corrections
- AC5 route pattern `**/v1/match` doesn't match URLs with query params — fixed to `**/v1/match?*`
- Tests using `page.setContent()` with `about:blank` origin hit CORS errors on fetch — switched to intercepting page URL with `page.route()` for same-origin serving
- Closed Shadow DOM blocks `element.shadowRoot` access in tests — added `page.addInitScript()` to patch `attachShadow` mode to `open` for tests that inspect internals
- `element.style.display` only returns inline styles, not computed CSS — used `getComputedStyle()` in tests
- SDK beacon format changed from `startup_id` to `viewer_startup_id` (batch) and added `shown_startup_id` (events) for analytics
- Directory SQL category loading required startup ID (UUID), not slug — fixed queries to return ID alongside slug

## Open Questions
- (none yet)
