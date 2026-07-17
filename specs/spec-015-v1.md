# spec-015-v1: UI Enhancement Suite — Skeletons, Transitions, Toasts, Sparklines

**Status:** DRAFT
**Version:** 1
**Depends On:** NONE (purely frontend, no backend changes)
**Blocks:** NONE
**Task Reference:** T-015

## What

Add four UX improvements to the React SPA: loading skeletons, page transitions, a toast notification system, and mini sparkline charts on dashboard KPIs. These are purely frontend enhancements with no backend changes.

## Acceptance Criteria

### Loading Skeletons
- Given any page that fetches data asynchronously (Directory, Profile, Dashboard), when the data is loading, then a skeleton placeholder matching the card/table layout is shown instead of a spinner
- Given a page with multiple data blocks, when some are loaded and others are still loading, then loaded content displays immediately while unloaded blocks show skeletons (no cascading wait)
- Given a page refresh, when data loads, then skeletons transition smoothly (fade-out) into real content

### Page Transitions
- Given a route change, when the user navigates between pages, then a subtle fade+slide transition plays (~300ms)
- Given a route change, when the transition is mid-play, then the previous page content remains visible until the new page is ready (prevent white flash)
- Given a route change that triggers data loading, when data is not yet available, then the skeleton shows inside the transition rather than a blank page

### Toast Notification System
- Given any user action (copy embed code, submit application, save settings), when the action completes, then a toast slides in from the bottom-right corner
- Given a toast, when 4 seconds pass, then the toast auto-dismisses with a fade-out animation
- Given multiple toasts triggered in quick succession, when displayed, then they stack vertically with 8px gap
- Given a toast, when the user clicks it, then it dismisses immediately
- Given an error response from an API call, when the error is not displayed inline, then a red error toast is shown

### Dashboard Sparklines
- Given the dashboard KPI cards, when rendered, then each card shows a small inline SVG sparkline chart (7 data points, one per day of the trailing week)
- Given a KPI card with data, when the sparkline renders, then it shows a smooth curved line with a subtle gradient fill beneath
- Given a KPI card where the value increased vs the prior 7-day period, when rendered, then a green up-arrow with "% change" is shown
- Given a KPI card where the value decreased, when rendered, then a red down-arrow with "% change" is shown

## Risks
- Sparklines require the backend to return daily-bucketed data (7 trailing days); if the dashboard API doesn't include this yet, we'll compute from existing `breakdowns` data or add the field to the endpoint
- Page transitions may cause a flash if React Suspense boundaries aren't placed correctly — mitigated by wrapping each page route in a Suspense boundary

## Rollback
Revert the component additions and CSS changes in the webapp — no database or API changes involved.
