# spec-019-v1: Dashboard Embed Status & Domain List

**Status:** DRAFT
**Version:** 1
**Depends On:** spec-004 (Startup Management), AUTH-001
**Blocks:** NONE
**Task Reference:** T-019

## What

Display the embed instances associated with a startup in the dashboard — showing the domain, widget format, theme, status (active/grace_period/removed), first-seen date, and last-verified timestamp. Alerts the user when an embed is in grace period (widget detected missing).

The `embed_instances` table already tracks this data from the re-crawl system, but there is no UI to view it.

## Acceptance Criteria

- Given an authenticated startup owner with active embed instances, when they navigate to `/dashboard/{id}`, then a new "Embedded Domains" card shows each domain with its format, theme, status badge, and last-verified timestamp
- Given an embed instance in grace period (widget removed, 7-day countdown), then the status badge is yellow with a "Grace Period — X days remaining" tooltip AND a dismissable banner appears at the top of the dashboard
- Given an embed instance that has been removed (grace period expired), then the status badge is red and the domain is greyed out
- Given the startup has no embed instances, when the dashboard loads, then the "Embedded Domains" card shows a prompt to paste the embed snippet on their site, with a copyable code block
- Given the startup has multiple domains, when loaded, then the list is sorted by status (active first) then by domain alphabetically

## Risks

Requires adding a `GET /v1/startups/{id}/embeds` endpoint or extending the existing dashboard endpoint. The `embed_instances` data is populated by the re-crawl system which may not be running yet in dev — the card should gracefully handle an empty state.

## Rollback

Remove the "Embedded Domains" card from the dashboard component. No schema changes needed — the data already exists.
