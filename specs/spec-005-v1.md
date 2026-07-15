# spec-005-v1: Matching & Ledger Service

**Status:** DRAFT
**Version:** 1
**Depends On:** spec-003, spec-004
**Blocks:** spec-006
**Task Reference:** T-005

## What

Implement the production matching engine HTTP API and the reciprocity ledger monthly computation. The matching logic (scoring, filtering, top-k selection) is already prototyped in spec-002 — this spec wraps it in a stateless HTTP service with database-backed candidate queries and Redis-backed match caching. The ledger computes monthly snapshots with carryover.

## Acceptance Criteria

- Given `GET /v1/match?startup_id=X&host_domain=example.com`, when X is active and eligible partners exist, then the response contains a `match` object with `id`, `name`, `one_line_pitch`, `url`, `logo_url`, `category`, and an `impression_id`
- Given `GET /v1/match?startup_id=X&host_domain=example.com`, when X has no eligible partners, then the response is `204 No Content`
- Given a stale match cache entry (older than 1 hour), when a match request arrives, then a fresh match is computed and the cache is updated
- Given the monthly ledger cron runs, then every active startup gets a new `reciprocity_ledger` entry with correct `balance`, `carryover_from_prev`, and `effective_balance`
- Given a startup with previous ledger data, when a new month is computed, then `carryover_from_prev = previous_balance * 0.2 + previous_carryover_from_prev`
- Given matching is requested for a startup with negative effective balance, then it is deprioritized but not excluded (its balance weight is negative)

## Risks

Cache stampede on match cache expiry for high-traffic startups. Mitigate with staggered expiry and optional pre-computation.

## Rollback

Remove the `/v1/match` route and the ledger cron job. Matching failures won't crash the system — SDk shows placeholder.
