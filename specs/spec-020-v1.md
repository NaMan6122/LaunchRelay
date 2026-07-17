# spec-020-v1: Competitor Exclusion UI

**Status:** DRAFT
**Version:** 1
**Depends On:** spec-004 (Startup Management), AUTH-001
**Blocks:** NONE
**Task Reference:** T-020

## What

Provide a dashboard page where startup owners can manage competitor exclusions — blocking specific startups or entire categories from being matched against their widget. The CRUD API exists at `POST/GET /v1/startups/{id}/exclusions` but has no frontend.

## Acceptance Criteria

- Given an authenticated user who owns a startup, when they navigate to `/dashboard/{id}/exclusions`, then a list of current exclusions is displayed split into two sections: "Blocked Startups" and "Blocked Categories"
- Given a user on the exclusions page, when they click "Add Exclusion" and select a startup by name (autocomplete search), then the exclusion is created via POST and appears immediately in the list
- Given a user on the exclusions page, when they click "Add Exclusion" and select a category from a dropdown, then the category exclusion is created
- Given a user with an existing exclusion, when they click the "Remove" button, then the exclusion is deleted via the API and removed from the list without page reload
- Given a user attempts to add a duplicate exclusion, when submitted, then a toast error "Already excluded" is shown and the exclusion is not duplicated
- Given an authenticated user who does NOT own the startup, when they attempt to access `/dashboard/{id}/exclusions`, then a 403 Forbidden is returned

## Risks

The autocomplete search for startups requires a new API endpoint (`GET /v1/startups?q=search`). For simplicity, this spec allows using a smaller set — just a dropdown of all active categories and a text input for startup slug/name that performs a directory-style search.

## Rollback

Remove the exclusions route from the dashboard. The API endpoints remain functional for direct callers.
