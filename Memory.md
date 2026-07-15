# Agent Memory

## Session Summary
Last Session: 2026-07-16
Active Task: (awaiting G1 approval for Phase 1 specs)
Last File Touched: spec-index.md
Immediate Next Step: Await human approval at Gate G1 for spec-003 through spec-008

## Active Task
_(none — awaiting G1 gate)_

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
**Outcome:** SDK upgraded from prototype to production. Real API calls to /v1/match, 3 formats (bar/badge/card), dark theme, HMAC auth, UTM tagging, 204 handling with placeholder, beacon tracking. 12/12 Playwright tests passing.
**Test Evidence:** sdk/test/verify.spec.mjs — 12 tests passing

## Self-Corrections
- AC5 route pattern `**/v1/match` doesn't match URLs with query params — fixed to `**/v1/match?*`
- Tests using `page.setContent()` with `about:blank` origin hit CORS errors on fetch — switched to intercepting page URL with `page.route()` for same-origin serving
- Closed Shadow DOM blocks `element.shadowRoot` access in tests — added `page.addInitScript()` to patch `attachShadow` mode to `open` for tests that inspect internals
- `element.style.display` only returns inline styles, not computed CSS — used `getComputedStyle()` in tests

## Open Questions
- (none yet)
