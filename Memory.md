# Agent Memory

## Session Summary
Last Session: 2026-07-17
Active Task: None — awaiting G1 approval for spec-015
Last File Touched: HD2DBackground.tsx
Immediate Next Step: Session complete — all spec-015 features implemented and committed

## Active Task
_(none — T-015 committed)_

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

### 2026-07-17 — T-014: UI Overhaul, Trust Badges, Webhooks & Boost
**State:** DONE
**Goal:** Complete backend features (webhooks, boost, verify) and overhaul the React SPA with glassmorphism design system, Three.js backgrounds, warm dark theme, and enhanced UI components
**Spec Reference:** specs/spec-011-v1.md, specs/spec-012, 013, 014 (no formal spec files — implemented in-session)
**Approach:** Implemented all outstanding features in parallel — webhooks CRUD + async firing, boost levels in matching/directory, traffic verification endpoint, then rewrote the entire React UI with glass cards, particle/HD2D backgrounds, animated sections, trust badges, and warm dark theme
**Checklist:**
  - [x] spec-011: Trust score badges on directory + profile pages
  - [x] spec-012: Verified traffic tier (POST /v1/startups/{id}/verify-traffic)
  - [x] spec-013: Webhook CRUD + async firing after conversions
  - [x] spec-014: Boost levels in matching, directory, profile
  - [x] SDK files (widget.js, pixel.js) served at /sdk/
  - [x] Nav component with scroll-awareness + mobile menu
  - [x] HD2D Three.js network constellation background
  - [x] Warm dark theme CSS overhaul
  - [x] GlassCard, Badge, TrustBadge, AnimatedSection, KpiCard components
  - [x] Home, Directory, Profile, Dashboard, About, Apply, Login pages updated
**Outcome:** All features implemented and committed as `0d83cc7` [T-014]. Build passes clean. Dev server running on :5173.
**Test Evidence:** `npm run build` passes (webapp), `go build ./...` passes (backend)
**Blockers:** NONE

### 2026-07-17 — T-015: UI Enhancement Suite
**State:** DONE
**Goal:** Add loading skeletons, page transitions, toast notifications, and dashboard sparklines to the React SPA
**Spec Reference:** spec-015-v1.md
**Approach:** Implemented four features in dependency order (toast system first as foundational, then skeletons, transitions, sparklines). Toast uses React context with auto-dismiss. Skeletons use CSS shimmer animation matching card layouts. Transitions use route-keyed CSS animation. Sparklines required backend change to dashboard.go (new DayBucket struct + daily-bucketed SQL queries) plus frontend Sparkline SVG component
**Checklist:**
  - [x] Toast: Toast component + ToastContext/Provider + Hook + CSS + wired into App
  - [x] Skeletons: Skeleton component with Card/Kpi/Grid/Table variants, replaced spinners in Directory/Profile/Dashboard
  - [x] Page transitions: Route-keyed fade+slide animation in App.tsx
  - [x] Sparklines: DayBucket struct + SQL queries in dashboard.go, Sparkline SVG component, KpiCard integration with trend computation
  - [x] Types updated in api.ts for impressions_by_day / clicks_by_day
**Outcome:** All four features implemented. Frontend `npm run build` and backend `go build ./...` both pass clean.
**Test Evidence:** `npm run build` (webapp), `go build ./...` (backend)
**Blockers:** NONE

## Self-Corrections
- AC5 route pattern `**/v1/match` doesn't match URLs with query params — fixed to `**/v1/match?*`
- Tests using `page.setContent()` with `about:blank` origin hit CORS errors on fetch — switched to intercepting page URL with `page.route()` for same-origin serving
- Closed Shadow DOM blocks `element.shadowRoot` access in tests — added `page.addInitScript()` to patch `attachShadow` mode to `open` for tests that inspect internals
- `element.style.display` only returns inline styles, not computed CSS — used `getComputedStyle()` in tests
- SDK beacon format changed from `startup_id` to `viewer_startup_id` (batch) and added `shown_startup_id` (events) for analytics
- Directory SQL category loading required startup ID (UUID), not slug — fixed queries to return ID alongside slug
- Initial Three.js pixel-art HD2D approach was glitchy (too many individual sprites) — replaced with network constellation using Points + LineSegments (single draw call each, much smoother)

## Open Questions
- (none yet)
