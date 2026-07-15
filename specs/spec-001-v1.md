# spec-001-v1: Embed SDK Prototype

**Status:** DRAFT
**Version:** 1
**Depends On:** NONE
**Blocks:** spec-007
**Task Reference:** T-001

## What

Prototype the embed SDK's core rendering pipeline in isolation: async script loading, Shadow DOM style isolation, IntersectionObserver-based viewport-impression tracking, and beacon batching. Confirm zero measurable CLS and <50ms render latency on a test page.

## Acceptance Criteria

- Given a test HTML page with the SDK script tag inserted, when the page loads, then the SDK creates a reserved-height container with `min-height` set, preventing layout shift
- Given the SDK script executes, when the container is created, then the widget content (logo, pitch, CTA placeholder) renders inside a `closed` Shadow DOM root
- Given the widget is rendered but below the viewport fold, when the user scrolls it into view for ≥1 second, then a single impression event is queued in the beacon batch
- Given the widget is visible for <1 second, when the user scrolls away, then no impression event is recorded
- Given multiple events are queued, when 30 seconds pass or `beforeunload` fires, then all queued events are sent via `navigator.sendBeacon()` in a single batch
- Given the API returns no match or is unreachable, when the SDK renders, then the container remains hidden (zero height) and does NOT block page rendering
- Given Lighthouse audit on the test page, when the SDK is present, then CLS score is 0.0 and TBT increase is <0ms

## Risks

Browser compatibility: IntersectionObserver requires modern browsers (Chrome 51+, Firefox 55+, Safari 12.1+). No polyfill for MVP — acceptable for a founder audience.

## Rollback

Remove the SDK script tag from the test page. No persistence or DB impact.
