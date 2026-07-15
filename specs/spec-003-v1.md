# spec-003-v1: Core Infrastructure

**Status:** DRAFT
**Version:** 1
**Depends On:** NONE
**Blocks:** spec-004, spec-005, spec-007, spec-008
**Task Reference:** T-003

## What

Set up the production project infrastructure: Docker Compose for PostgreSQL, database schema migrations, Go API server scaffold (Fastify-equivalent for Go — use `chi` or `gin`), project wiring, shared types, and `Makefile` for common commands. This is the foundation every other spec builds on.

## Acceptance Criteria

- Given `docker compose up`, then PostgreSQL starts on port 5432 with the configured database and user
- Given the API server starts, then it listens on port 8080 and responds with `200 OK` at `GET /v1/health`
- Given the first migration runs, then tables `startups`, `categories`, `startup_categories`, `category_adjacencies`, `embed_instances`, `impressions`, `clicks`, `reciprocity_ledger`, `trust_signals`, `daily_metrics`, `match_cache`, `competitor_exclusions` are created matching the TDD §4 schema
- Given `make migrate` runs, then it applies all pending migrations without error
- Given `make test` runs, then all current unit tests pass
- Given an invalid request (e.g. missing body), then the API returns a structured `{ "error": "..." }` response with the appropriate HTTP status code

## Risks

Docker not available on the host machine — mitigate with a fallback connection string for local PostgreSQL.

## Rollback

`docker compose down -v` removes the database volume. `git revert` on the scaffold commit removes the code.
