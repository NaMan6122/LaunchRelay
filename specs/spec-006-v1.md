# spec-006-v1: Embed SDK Production

**Status:** DRAFT
**Version:** 1
**Depends On:** spec-005
**Blocks:** NONE
**Task Reference:** T-006

## What

Upgrade the embed SDK from the Phase 0 prototype (mock API) to production-ready: real API calls to the matching endpoint, HMAC token authentication, all three widget formats (bar, badge, card), light/dark theming, and configurable position. The prototype's core (Shadow DOM, IntersectionObserver, beacon batching) carries forward unchanged.

## Acceptance Criteria

- Given the SDK loads on a page, when it calls `GET /v1/match` with signed token, then it renders the returned partner startup in the widget
- Given the SDK is configured with `data-format="bar"` and `data-position="top"`, then the widget renders as a fixed bar at the top of the viewport with 48px height
- Given the SDK is configured with `data-format="card"`, then the widget renders as a non-fixed inline card within the page flow
- Given the SDK is configured with `data-format="badge"`, then the widget renders as a 64×64 circle badge in the bottom-right corner that expands on hover
- Given the SDK is configured with `data-theme="dark"`, then the widget uses dark background (#1a1a1a) and light text (#e0e0e0)
- Given the API returns 204 (no match), then the widget shows a placeholder "Supporting indie founders" message with a link to the directory
- Given the API is unreachable, then the widget hides completely (zero height, no CLS impact)
- Given the embed code includes `data-no-branding`, then the "LaunchRelay" text/watermark is not shown

## Risks

Widget format expansion may increase bundle size. Mitigate: lazy-load CSS per format.

## Rollback

Replace CDN-hosted `widget.js` with the previous version. SDK implementations are immutable once pasted.
