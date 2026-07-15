# spec-004-v1: Startup Management

**Status:** DRAFT
**Version:** 1
**Depends On:** spec-003
**Blocks:** spec-005, spec-007, spec-008
**Task Reference:** T-004

## What

Implement the startup onboarding flow (registration, approval, embed code generation), category CRUD with adjacency graph, and competitor exclusion management. This covers three TDD entities in one spec: `startups`, `categories`, and `competitor_exclusions`.

## Acceptance Criteria

- Given `POST /v1/startups` with name, url, pitch, categories, email, then a startup is created with `status: pending` and an embed code snippet is returned
- Given a pending startup exists, when an admin calls `PATCH /v1/startups/:id` with `status: active`, then the startup becomes active and eligible for matching
- Given a startup is active, when it has no embed instance, then `GET /v1/match` returns `204 No Content`
- Given `GET /v1/categories`, then all category names and slugs are returned
- Given a startup calls `POST /v1/startups/:id/exclusions` with `{ excluded_startup_id }`, then that startup is excluded from being matched with the specified startup
- Given a startup calls `GET /v1/startups/:id/exclusions`, then all excluded startups and categories are returned
- Given an invalid startup URL (non-parseable), when `POST /v1/startups`, then a `400` error is returned with a descriptive message

## Risks

Manual review gate for new startups creates latency. Fully automated approval (with spam checks) may need tuning post-launch.

## Rollback

Deleting the onboarding endpoints from the API. No data loss if startups were created.
