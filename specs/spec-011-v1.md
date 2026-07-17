# spec-011-v1: Public Trust Score on Directory

**Status:** DRAFT
**Version:** 1
**Depends On:** spec-003 (trust score), spec-002 (directory & profile)
**Blocks:** NONE
**Task Reference:** T-011

## What

Surface the already-computed `trust_score` on public directory pages with meaningful visual indicators (badges, color coding) and an explanation of what drives the score. Currently the profile page shows a raw decimal but there's no context or visual hierarchy — and the directory listing cards don't show it at all.

## Acceptance Criteria

- Given a startup with trust_score >= 0.8, when viewed on the directory listing or profile page, then a green "High Trust" badge is shown
- Given a startup with trust_score >= 0.5 and < 0.8, when viewed on the directory listing or profile page, then a yellow "Trusting" badge is shown
- Given a startup with trust_score < 0.5, when viewed on the directory listing or profile page, then a gray "New" badge is shown
- Given no trust_score exists yet (0.0), the badge defaults to "New"
- Given the directory listing page, when rendered, then each card shows the trust badge
- Given the profile page, when rendered, then the trust section includes the badge with a short explanation of what factors contribute (active widget, impressions volume, traffic verified)
- Hovering over the badge shows a tooltip explaining the score (or a small text note below it)

## Implementation

### Directory listing

Add `TrustScore` to `DirectoryEntryData` struct and include it in the SQL query. Display a small colored badge on each card.

### Profile page

The profile already shows the raw `TrustScore` value. Replace the raw number with a visual badge + the number. Add a small explanation text below:

> **Trust Score: 0.843** — High Trust
> Based on widget activity, impression volume, and verified traffic.

### Score ranges

| Range     | Label       | Color  |
|-----------|-------------|--------|
| >= 0.8    | High Trust  | Green  |
| >= 0.5    | Trusting    | Yellow |
| < 0.5     | New         | Gray   |

### Tooltip/context

A short explanation row on the profile page:
> The trust score is based on widget embed activity, impression volume, and optional traffic verification. Higher scores get priority in the matching algorithm.

## Risks

None — the data already exists and is already exposed through the API. This is purely a UI improvement.

## Rollback

Revert the template changes and directory query changes.
