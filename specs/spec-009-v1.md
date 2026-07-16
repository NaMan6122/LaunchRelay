# spec-009-v1: Richer Analytics

**Status:** DRAFT
**Version:** 1
**Depends On:** spec-007 (analytics pipeline), spec-006 (SDK beacon)
**Blocks:** NONE
**Task Reference:** T-009

## What

Enrich the analytics pipeline to capture and display country, device type, and referrer breakdowns per impression. The impressions table already has the columns (`country`, `device_type`, `referrer`) — this spec wires them through from the SDK beacon to the database to the dashboard UI.

Currently the SDK sends `impression_id`, `shown_startup_id`, and `timestamp` per event. Country and device type are determined server-side from the HTTP request (IP → country via Accept-Language fallback, User-Agent → device type via parsing). Referrer is captured client-side by the SDK from `document.referrer` and included in the beacon.

## Acceptance Criteria

- Given an impression beacon is received, when the request includes a `Referer` header and `User-Agent` header, then `referrer` and `device_type` are stored on the impression record
- Given the SDK sets `document.referrer` in the beacon event's `referrer` field, when the server receives the event, then the SDK-provided referrer takes precedence over the HTTP `Referer` header
- Given impressions exist with device_type values, when the dashboard loads, then a breakdown card shows impression count per device type (desktop, mobile, tablet)
- Given impressions exist with referrer values, when the dashboard loads, then a breakdown card shows top referrer sources by impression count
- Given impressions exist with country values, when the dashboard loads, then a breakdown card shows top countries by impression count
- Given no impressions exist for a startup, then the breakdown section shows an empty state ("No data yet")
- Given the User-Agent is unrecognizable (not desktop/mobile/tablet), then `device_type` defaults to "desktop"

## Implementation Notes

- **Device detection**: server-side User-Agent parsing (regex-based: "Mobile|Android.*Mobile|iPhone|iPod" → mobile, "iPad|Android(?!.*Mobile)|Tablet" → tablet, everything else → desktop). No external UA library needed for MVP.
- **Country detection**: Use `Accept-Language` header as a rough proxy for MVP (`req.Header.Get("Accept-Language")` → extract first locale code). A note in the dashboard labels this as "Estimated". Future: replace with Cloudflare `CF-IPCountry` or a GeoIP database.
- **Referrer**: SDK reads `document.referrer` at impression time and sends it in the event. Server falls back to the HTTP `Referer` header if the SDK value is empty.
- **No new tables or migrations** — the `impressions` table already has the columns.

## SDK Beacon Changes

The `BeaconEvent` interface gains a new optional field:

```typescript
interface BeaconEvent {
  type: 'impression' | 'click';
  impression_id: string;
  shown_startup_id: string;
  referrer?: string;
  timestamp: number;
}
```

The SDK captures `document.referrer` at the moment the impression timer fires and includes it in the queued event. No other client-side changes needed (device type is handled server-side).

## Dashboard Additions

The dashboard HTML page gains a new "Audience Breakdown" card below the KPI grid with three sub-sections:

1. **By Device** — horizontal bar chart: desktop N (XX%), mobile N (XX%), tablet N (XX%)
2. **By Referrer** — top 10 referrers with impression count
3. **By Country (estimated)** — top 10 countries with impression count

Each section is a simple table — no charting library. Countries with unknown/empty values are grouped as "(unknown)".

The JSON dashboard endpoint (`GET /v1/dashboard/:startup_id`) adds a `breakdowns` object:

```json
{
  "startup_id": "uuid",
  "overview": { ... },
  "breakdowns": {
    "by_device": [
      { "device_type": "desktop", "impressions": 450, "percentage": 60.0 },
      { "device_type": "mobile", "impressions": 250, "percentage": 33.3 },
      { "device_type": "tablet", "impressions": 50, "percentage": 6.7 }
    ],
    "by_referrer": [
      { "source": "news.ycombinator.com", "impressions": 120 },
      { "source": "direct", "impressions": 80 }
    ],
    "by_country": [
      { "country": "US", "impressions": 300 },
      { "country": "GB", "impressions": 100 },
      { "country": "", "impressions": 200 }
    ]
  }
}
```

## Risks

- User-Agent-based device detection is imperfect (spoofable, new devices may not match patterns). For MVP this is acceptable — accuracy will improve over time via header expansion.
- Accept-Language-based country detection is a rough approximation and may be misleading. The dashboard labels this clearly as "estimated." Future: use Cloudflare `CF-IPCountry` header or a GeoIP database.
- Adding referrer to the beacon increases event size marginally (<100 bytes per event). Negligible at MVP scale.

## Rollback

Remove the breakdowns section from the dashboard template. The backend analytics endpoint still returns breakdown data but the UI doesn't display it. No schema changes to roll back.
