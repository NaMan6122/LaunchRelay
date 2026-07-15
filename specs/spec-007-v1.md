# spec-007-v1: Analytics & Dashboard

**Status:** DRAFT
**Version:** 1
**Depends On:** spec-003, spec-004, spec-005
**Blocks:** NONE
**Task Reference:** T-007

## What

Implement the analytics ingestion pipeline (impression/click batch API) and the founder-facing web dashboard. The dashboard shows KPIs (impressions, clicks, CTR, reciprocity balance, match history, trust status). The directory pages (SEO, public) are also included.

## Acceptance Criteria

- Given `POST /v1/impressions` with a batch of impression events, then each impression is stored with the correct `viewer_startup_id`, `shown_startup_id`, `timestamp`, and `verified` status
- Given `POST /v1/clicks` with an `impression_id`, then a click is recorded and linked to the parent impression
- Given duplicate `impression_id` values in the batch, then duplicates are silently discarded (idempotent)
- Given a founder visits `/dashboard` and authenticates, then they see: 7-day impressions, 7-day clicks, CTR, reciprocity balance, recent matched partners, and trust score
- Given a founder has no impressions yet, then the dashboard shows zeros and a "Get started" prompt
- Given `GET /v1/directory` is requested (public, no auth), then a paginated, filterable list of active startups is returned
- Given `GET /v1/directory/:slug` is requested, then the individual startup profile page data is returned with public stats (30d impressions, 30d clicks, trust score)

## Risks

Dashboard requires a Next.js frontend — significant scope. If the founder is a single person, a server-rendered HTML template (e.g. `templ` or `html/template`) may be faster to ship than a full Next.js app.

## Rollback

Remove the dashboard routes. Analytics data still accumulates in the database.
