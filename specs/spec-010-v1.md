# spec-010-v1: Conversion Pixel

**Status:** DRAFT
**Version:** 1
**Depends On:** spec-006 (SDK), spec-007 (analytics pipeline)
**Blocks:** NONE
**Task Reference:** T-010

## What

A lightweight conversion pixel that founders paste on their post-conversion pages (thank-you, signup-complete, purchase-confirmed). When a visitor who arrived via a LaunchRelay widget impression converts, the pixel fires a conversion event that gets attributed to the original referral impression. The dashboard then shows attributed conversions and conversion rate per partner.

## How It Works

1. The widget appends `lr_ref=<impression_id>` to the CTA link URL (alongside existing UTM params)
2. The visitor clicks through to the partner's site with `lr_ref` in the URL
3. The conversion pixel script loads on the partner's site and captures `lr_ref` from the URL
4. It stores `lr_ref` in `localStorage` as `lr_last_impression` (survives navigation)
5. On the conversion/thank-you page, the pixel reads `lr_last_impression` from localStorage
6. It sends `POST /v1/conversions` with the `impression_id` and optional metadata
7. The backend records the conversion, tied to the original impression
8. The pixel clears `lr_last_impression` from localStorage to prevent double-counting
9. The dashboard displays attributed conversions and conversion rate per partner

## Acceptance Criteria

- Given a widget CTA link, when rendered, then the URL contains `lr_ref=<impression_id>` alongside any UTM parameters
- Given the conversion pixel loads on a page whose URL contains `lr_ref=<uuid>`, then it stores the value in localStorage and sends `POST /v1/conversions` to the LaunchRelay beacon endpoint
- Given the conversion pixel loads on a page and finds `lr_last_impression` in localStorage, then it sends `POST /v1/conversions` and clears the localStorage key
- Given the conversion pixel has fired for an impression_id, then it does NOT fire again for the same impression_id (idempotent — `ON CONFLICT DO NOTHING` on the backend)
- Given a founder has conversions recorded, when the dashboard loads, then a "Conversions" KPI card shows total conversions and conversion rate (conversions / clicks × 100)
- Given the Recent Matched Partners table already exists, when conversions exist, then a "Conversions" column appears showing attributed conversions per partner

## Data Model

New `conversions` table:

```sql
CREATE TABLE conversions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    impression_id     UUID NOT NULL REFERENCES impressions(id) ON DELETE CASCADE,
    viewer_startup_id UUID NOT NULL REFERENCES startups(id),
    shown_startup_id  UUID NOT NULL REFERENCES startups(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (impression_id)
);
```

One conversion max per impression (`UNIQUE (impression_id)`). No conversion value field for MVP (just a binary conversion event).

## SDK Changes

### Widget CTA links

The CTA link URL builder appends `lr_ref=<impression_id>`:

```typescript
const href = m.url + utm + `&lr_ref=${impressionId}`;
```

The `utm` string already has a leading `?` (or `&` for subsequent params), so `&lr_ref=` is correct.

### Conversion pixel script

A new standalone JS file `pixel.js` served at `GET /pixel.js`. Founders include it on their conversion page:

```html
<script src="https://cdn.launchrelay.com/pixel.js" data-startup-id="YOUR_STARTUP_ID" async></script>
```

The pixel:

1. Reads `lr_ref` from `URLSearchParams(window.location.search)` — if found, stores in `localStorage.setItem('lr_last_impression', lr_ref)`
2. Reads `lr_last_impression` from localStorage — if found, fires a beacon to `POST /v1/conversions` with `{ impression_id, startup_id }`
3. Clears `localStorage.removeItem('lr_last_impression')` regardless of success (prevents re-send on page reload)
4. Uses `navigator.sendBeacon` for the POST (fire-and-forget, works on page unload)

No Shadow DOM, no IntersectionObserver — pure `sendBeacon` in ~1KB.

## Backend Changes

### New endpoint: `POST /v1/conversions`

Request:
```json
{
  "impression_id": "uuid",
  "startup_id": "uuid"
}
```

Response: `{ "accepted": true }`

Logic:
- Validate impression_id and startup_id are non-empty
- Look up the impression by id to get `viewer_startup_id` and `shown_startup_id`
- Verify the `startup_id` matches the impression's `shown_startup_id` (security — only the shown startup can claim a conversion)
- Insert into `conversions` table (`ON CONFLICT (impression_id) DO NOTHING` for idempotency)

### Dashboard JSON endpoint

`GET /v1/dashboard/:startup_id` gains:

```json
{
  "overview": {
    "conversions_7d": 5,
    "conversion_rate": 12.5
  },
  ...
}
```

New queries:
- `SELECT COUNT(*) FROM conversions WHERE viewer_startup_id = $1 AND created_at >= $2` — conversions 7d
- `conversion_rate = conversions_7d / clicks_7d * 100` (if clicks > 0)

Recent matches query also gets a conversion count per partner.

### Dashboard HTML

- New KPI card showing conversions and conversion rate (if clicks exist)
- "Conversions" column in the Recent Matched Partners table

## Risks

- localStorage may not be available in all contexts (private browsing, iframes). The pixel silently degrades — no crash, just no conversion recorded.
- Multiple impression IDs from the same viewer (they visit multiple sites with LaunchRelay). Only the **last** click's `lr_ref` survives in localStorage. This is acceptable for MVP — last-click attribution.
- Founders could spam the conversion pixel. Mitigated by `UNIQUE (impression_id)` — only one conversion per impression.
- The `startup_id` check prevents one founder from claiming conversions meant for another.

## Rollback

Remove the conversion pixel script from the CDN. The `conversions` table and API endpoint remain but are unused. Dashboard reverts to not showing conversion data.
