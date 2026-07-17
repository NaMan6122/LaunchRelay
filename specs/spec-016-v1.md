# spec-016-v1: Startup Profile Editor

**Status:** DRAFT
**Version:** 1
**Depends On:** spec-004 (Startup Management), AUTH-001 (auth middleware)
**Blocks:** NONE
**Task Reference:** T-016

## What

Allow authenticated startup owners to edit their startup profile — name, website URL, one-line pitch, and categories — after the initial application. Currently the `PATCH /v1/startups/{id}` endpoint only supports status changes; this spec extends it to accept profile fields and adds a settings page in the dashboard UI.

## Acceptance Criteria

- Given an authenticated user who owns a startup, when they PATCH `/v1/startups/{id}` with updated `name`, `url`, `one_line_pitch`, or `categories`, then the startup record is updated and the new values are returned
- Given an authenticated user, when they navigate to `/dashboard/{id}/settings`, then a form pre-filled with current values is displayed
- Given an authenticated user on the settings page, when they submit valid changes, then the changes are saved and a success toast is shown
- Given an unauthenticated user, when they attempt to access `/dashboard/{id}/settings`, then they should be redirected to login
- Given an authenticated user who does NOT own the startup, when they attempt to PATCH `/v1/startups/{id}`, then a 403 Forbidden should be returned
- Given a valid URL change, when the URL format is invalid (not http/https), then a 400 error should be returned AND the field should show inline validation
- Given a pitch exceeding 280 characters, when submitted, then a 400 error should be returned with the field highlighted

## Risks

Relies on the auth middleware + ownership check wired in AUTH-001. If those are not deployed, this endpoint remains publicly writable.

## Rollback

Remove the settings route from the React router and the `PATCH` handler additions in `startups.go`. Revert to the status-only PATCH behavior.
