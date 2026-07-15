# LaunchRelay — Technical Design Document

**Status:** Draft v1
**Based on:** PRD v1 (§8–§18 plus cold-start elaboration)
**Scope:** Full-system architecture, component specs, API contracts, data model, algorithm details, infrastructure, and testing strategy.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Component Specifications](#2-component-specifications)
   - 2.1 Embed SDK
   - 2.2 Matching Engine
   - 2.3 Trust & Fraud Layer
   - 2.4 Analytics Pipeline
   - 2.5 Public Directory
   - 2.6 Founder Dashboard
3. [API Contracts](#3-api-contracts)
4. [Data Model](#4-data-model)
5. [Matching & Reciprocity Algorithm](#5-matching--reciprocity-algorithm)
6. [Security & Anti-Gaming](#6-security--anti-gaming)
7. [Infrastructure & Deployment](#7-infrastructure--deployment)
8. [Testing Strategy](#8-testing-strategy)
9. [Performance Budgets & SLAs](#9-performance-budgets--slas)
10. [Open Technical Questions](#10-open-technical-questions)

---

## 1. System Architecture

### 1.1 High-level overview

```
┌──────────────────────────┐     ┌────────────────────────────────────┐
│   Founder Website A      │     │        LaunchRelay Platform        │
│  ┌────────────────────┐  │     │                                    │
│  │  Embed SDK (widget) │──┼────▶│  ┌────────────┐  ┌────────────┐  │
│  └────────────────────┘  │     │  │  Matching  │  │ Analytics  │  │
│                          │     │  │  Engine    │  │ Pipeline   │  │
│  ┌────────────────────┐  │     │  └─────┬──────┘  └──────┬─────┘  │
│  │  Founder Dashboard │◀─┼─────│        │                │        │
│  └────────────────────┘  │     │  ┌─────▼──────┐  ┌──────▼─────┐  │
└──────────────────────────┘     │  │  Trust &   │  │  Public    │  │
                                 │  │  Fraud     │  │  Directory │  │
┌──────────────────────────┐     │  │  Layer     │  │  (ISR)     │  │
│   Founder Website B      │     │  └────────────┘  └────────────┘  │
│  ┌────────────────────┐  │     │                                    │
│  │  Embed SDK (widget) │──┼────▶│  ┌────────────────────────────┐  │
│  └────────────────────┘  │     │  │  PostgreSQL + Redis         │  │
└──────────────────────────┘     │  │  + Job Queue (re-crawl)     │  │
                                 │  └────────────────────────────┘  │
                                 └────────────────────────────────────┘
```

### 1.2 Component boundaries & communication

| Component | Communicates via | Stateful? | Scalability |
|---|---|---|---|
| Embed SDK | REST API + CDN | No (stateless client) | N/A (client-side) |
| Matching Engine | REST API (internal) | No (cache-backed) | Horizontal (stateless) |
| Analytics Pipeline | REST API (ingest) + Batch DB writes | No | Horizontal (stateless) |
| Trust & Fraud Layer | REST API + Job Queue + SCHEDULED CRON | No (stateless) | Horizontal |
| Public Directory | Next.js ISR + Database | No (pre-rendered) | CDN-cacheable |
| Founder Dashboard | Next.js SSR | No | Horizontal |

### 1.3 Request flow (widget load)

```
1. Browser loads Founder A's page
2. Embed SDK script executes (async, defer)
3. SDK calls GET /api/v1/match?startup_id=A&host_domain=example.com
4. API Gateway → Matching Engine
5. Engine computes best partner B for A
6. Returns { startup: { id, name, pitch, url, logo_url, category }, styles_url, impression_id }
7. SDK creates Shadow DOM, fetches CSS from CDN, renders widget
8. SDK attaches IntersectionObserver to the container
9. After viewport-visible for ≥1s, sends POST /api/v1/impressions [{impression_id, verified: true, timestamp}]
10. On click, sends POST /api/v1/clicks { impression_id, timestamp }
11. Click navigates to partner B's URL with UTM params appended
```

---

## 2. Component Specifications

### 2.1 Embed SDK

**File:** `packages/embed-sdk/src/index.ts`
**Target:** <5KB gzipped, zero dependencies, works in all modern browsers (ES2020+)

#### 2.1.1 Loading

```html
<script
  src="https://cdn.launchrelay.com/widget.js"
  data-startup-id="uuid-abc-123"
  data-theme="light"
  data-format="bar"
  data-position="bottom"
  data-no-branding
  async
></script>
```

The SDK is a **self-executing IIFE** that:
1. Reads its own `<script>` tag's `data-*` attributes to get startup_id and options
2. Creates a reserved-height container `<div id="lr-slot">` at the configured position
3. Sets `min-height` on the slot to prevent CLS (default 48px for bar, configurable)
4. Fetches match data from the API
5. Attaches a `<template>` with Shadow DOM, renders the widget inside it
6. Signals readiness via a `data-lr-ready` attribute on the slot (for host-page analytics)

#### 2.1.2 Shadow DOM isolation

```typescript
// Inside the SDK:
const host = document.getElementById('lr-slot');
const shadow = host.attachShadow({ mode: 'closed' });
// "closed" prevents the host page from reaching into the widget DOM
// Fetch CSS from CDN and inject into shadow root
const style = document.createElement('style');
style.textContent = await fetchWidgetStyles(options.theme);
shadow.appendChild(style);
// Render content
shadow.appendChild(widgetRootElement);
```

#### 2.1.3 Impression tracking

```typescript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Start a 1s timer — impression only counts after 1s continuous visibility
        if (!visibilityTimer) {
          visibilityTimer = setTimeout(() => {
            impressionBeacon(impressionId, 'viewport');
          }, 1000);
        }
      } else {
        // Cancel timer if user scrolls away before 1s
        if (visibilityTimer) {
          clearTimeout(visibilityTimer);
          visibilityTimer = null;
        }
      }
    });
  },
  { threshold: 0.5 } // At least 50% visible
);
observer.observe(widgetContainer);
```

#### 2.1.4 Beacon batching

- Batches impressions locally for up to 30 seconds before sending
- On `beforeunload`, sends any pending beacons via `navigator.sendBeacon()`
- Maximum batch size: 20 events per request

```typescript
interface BeaconBatch {
  startup_id: string;
  events: Array<{
    type: 'impression' | 'click';
    impression_id: string;
    timestamp: number;
  }>;
}
```

#### 2.1.5 Widget formats

**Bar (MVP):** Fixed 48px × 100% bar at top or bottom of viewport. Shows logo + pitch + "Learn More" button. Sticky with `position: fixed`.

**Corner badge (P1):** 64×64 circle badge in bottom-right corner. On hover, expands to a popover card.

**Inline card (P1):** A horizontal card designed to sit within content. No absolute/fixed positioning. 100% width, variable height. Responsive.

#### 2.1.6 Fallback behavior

- If the API returns no match (empty network), the widget shows a subtle "Supporting indie founders" placeholder with a link to the directory
- If the API is unreachable (network error), the container remains hidden (zero-height via CSS)
- No blocking of host-page rendering under any circumstances

---

### 2.2 Matching Engine

**Service name:** `matching-service`
**Language:** Go (low latency, concurrent matching across large sets) or Node.js (for team alignment)
**Interface:** Internal gRPC or REST (called by API gateway)

#### 2.2.1 Match request lifecycle

```
1. Request arrives with startup_id + host_domain
2. Check Redis cache: "match:{startup_id}" — return if fresh (<1 hour old)
3. If cache miss:
   a. Load requesting startup's record (categories, trust_score, balance)
   b. Query eligible candidates (active, same/adjacent categories, not self, not excluded)
   c. Compute score for each candidate
   d. Select highest-scoring candidate (with randomness for diversity: top-3, weighted random pick)
   e. Cache result for 1 hour
   f. Return result
```

#### 2.2.2 Candidate filtering

Before scoring, filter out:
- Self (same startup_id)
- Delisted/paused members
- Startups in excluded categories (from requester's competitor_exclusions)
- Startups that have already been shown to this requester >5 times in the last 7 days
- Startups with trust_score below minimum threshold (configurable, default 0.2)

#### 2.2.3 Scoring formula (detailed)

```
score(P, R) = w1 * category_similarity(P, R)
            + w2 * normalized_balance(P)
            + w3 * trust_score(P)
            + w4 * recency_diversity_penalty(P, R)
            - w5 * size_mismatch_penalty(P, R)
```

Where:

- **category_similarity(P, R)** = Jaccard similarity of category sets: `|P.cats ∩ R.cats| / |P.cats ∪ R.cats|`
  - Range: [0, 1]
  - Adjacent categories count as 0.5 overlap (configurable)

- **normalized_balance(P)** = `tanh(balance(P) / network_balance_stddev)`
  - Range: [-1, 1]
  - tanh squashes outliers while preserving sign
  - A positive balance (giving more than receiving) = higher score

- **trust_score(P)** = aggregate score in [0, 1] from Trust & Fraud Layer
  - Default for new members: 0.5
  - Each re-crawl pass: +0.1 (capped at 1.0)
  - Each re-crawl fail: -0.2 (minimum 0)

- **recency_diversity_penalty(P, R)** = `min(1, recent_shown_count / 10)`
  - Range: [0, 1]
  - Where `recent_shown_count` = how many times P has been shown to R's visitors in the last 7 days
  - Directly subtracted from score (higher penalty = lower final score)

- **size_mismatch_penalty(P, R)** = `|rank(P.traffic) - rank(R.traffic)| / network_size`
  - Range: [0, 1]
  - Penalizes pairing a 100k-visit/month site with a 100-visit/month site
  - Reduces the rich-get-richer effect

**Default weights (v1):** `w1=0.35, w2=0.20, w3=0.20, w4=0.15, w5=0.10`
**Cold-start override (first 500 members):** `w1=0.25, w2=0.10, w3=0.15, w4=0.10, w5=0.05` with remaining `0.35` as pure-random to explore pairings.

#### 2.2.4 Diversity selection

Rather than always returning the top-scoring match, implement **top-k weighted random selection**:

```typescript
function selectMatch(candidates: ScoredStartup[]): Startup {
  // Sort by score descending, take top 5
  const top = candidates.sort((a,b) => b.score - a.score).slice(0, 5);
  // Weighted random: highest score gets ~40% chance, lowest ~10%
  const weights = top.map((_, i) => 0.4 * Math.pow(0.5, i));
  const total = weights.reduce((a, b) => a + b, 0);
  const normalized = weights.map(w => w / total);
  // Sample
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < top.length; i++) {
    cumulative += normalized[i];
    if (r <= cumulative) return top[i];
  }
  return top[0];
}
```

---

### 2.3 Trust & Fraud Layer

**Service name:** `trust-service`
**Components:**
- Impression/click validation (inline, per-request)
- Re-crawl job (scheduled, background)
- Manual review queue (dashboard for admin)

#### 2.3.1 Impression validation rules

| Rule | Action |
|---|---|
| Request from same IP >50 impressions/minute | Rate-limit, flag for review |
| User-Agent matches known headless browser | Discard impression, flag |
| Impressions sent for a match >30 minutes old | Discard (session expired) |
| Impression count >> estimated organic traffic for domain | Flag for manual review |
| Viewport verification failed | Mark impression as unverified (counts for analytics but not reciprocity) |

#### 2.3.2 Re-crawl job

**Schedule:** Daily (configurable per tier)

**Implementation:**

```typescript
// Pseudocode for the re-crawl worker
async function recrawlMember(startup: Startup): Promise<RecrawlResult> {
  const html = await fetch(startup.url);
  // Check for embed script pattern
  const hasEmbed = html.includes(`data-startup-id="${startup.id}"`)
                && html.includes('cdn.launchrelay.com/widget.js');

  if (!hasEmbed) {
    // Check current status
    const embedInstance = await db.embedInstance.findFirst({
      where: { startup_id: startup.id, status: 'active' }
    });
    if (!embedInstance) return { status: 'no_change' }; // Already removed

    if (embedInstance.status === 'grace_period') {
      // Grace period already started — check if 7 days have passed
      if (daysSince(embedInstance.last_verified_at) >= 7) {
        await deList(startup);
        return { status: 'delisted', reason: 'grace_period_expired' };
      }
      return { status: 'grace_period_continuing' };
    }

    // First detection — start grace period
    await db.embedInstance.update({
      where: { id: embedInstance.id },
      data: { status: 'grace_period', last_verified_at: new Date() }
    });
    await notifyOwner(startup, 'embed_missing');
    return { status: 'grace_period_started' };
  }

  // Embed is present — update verification timestamp
  await db.embedInstance.update({
    where: { startup_id: startup.id },
    data: { last_verified_at: new Date(), status: 'active' }
  });
  return { status: 'verified' };
}
```

#### 2.3.3 Trust score computation

```typescript
function computeTrustScore(startup: Startup): number {
  let score = 0.5; // baseline

  // Domain age bonus
  const ageInDays = daysSince(startup.created_at);
  score += Math.min(0.1, ageInDays / 365 * 0.1);

  // Re-crawl history
  const recentCrawls = await getRecentCrawls(startup.id, 30); // last 30 days
  const passRate = recentCrawls.filter(c => c.status === 'verified').length / Math.max(1, recentCrawls.length);
  score += (passRate - 0.8) * 0.3; // ±0.3 based on pass rate relative to 80% baseline

  // Manual review flags
  const flags = await getActiveFlags(startup.id);
  score -= flags.length * 0.1;

  // Verified traffic tier bonus (P2)
  if (startup.verified_traffic_tier) {
    score += 0.15;
  }

  return Math.max(0, Math.min(1, score));
}
```

---

### 2.4 Analytics Pipeline

**Service name:** `analytics-service`
**Data flow:**

```
SDK Beacon → POST /api/v1/impressions → API Gateway → Kafka/Redis Stream → Batch Writer → PostgreSQL
SDK Beacon → POST /api/v1/clicks       → API Gateway → Kafka/Redis Stream → Batch Writer → PostgreSQL
```

#### 2.4.1 Data retention

| Data | Retention | Aggregation |
|---|---|---|
| Raw impressions | 90 days | Daily rollup: per-startup, per-partner |
| Raw clicks | 90 days | Daily rollup: per-startup, per-partner |
| Reciprocity ledger | 13 months | Monthly snapshots |
| Conversion events (P2) | 180 days | Per-event |
| Country/device/referrer breakdowns | 90 days | Daily rollup |

#### 2.4.2 Aggregation queries

```sql
-- Daily impressions per startup
INSERT INTO daily_metrics (startup_id, date, impressions, clicks, ctr)
SELECT
  viewer_startup_id,
  DATE(timestamp) as date,
  COUNT(*) as impressions,
  COUNT(clicks.id) as clicks,
  COUNT(clicks.id)::float / COUNT(*) as ctr
FROM impressions
LEFT JOIN clicks ON clicks.impression_id = impressions.id
WHERE DATE(timestamp) = CURRENT_DATE - 1
GROUP BY viewer_startup_id, DATE(timestamp);
```

---

### 2.5 Public Directory

**Framework:** Next.js (ISR)

#### 2.5.1 Pages

| Route | Content | Cache strategy |
|---|---|---|
| `/directory` | Paginated grid of all startups, filterable by category | ISR, revalidate: 1 hour |
| `/directory/category/[slug]` | Filtered grid for one category | ISR, revalidate: 1 hour |
| `/directory/[slug]` | Individual startup profile page | ISR, revalidate: 1 hour |
| `/directory/[slug]/stats` | Public stats (impressions, trust score) | SSR (fresh per request) |

#### 2.5.2 Startup profile page SEO

```html
<title>{{ startup.name }} — LaunchRelay Directory</title>
<meta name="description" content="{{ startup.one_line_pitch }}" />
<meta property="og:title" content="{{ startup.name }}" />
<meta property="og:description" content="{{ startup.one_line_pitch }}" />
<meta property="og:url" content="https://launchrelay.com/directory/{{ startup.slug }}" />
<link rel="canonical" href="https://launchrelay.com/directory/{{ startup.slug }}" />
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "{{ startup.name }}",
  "applicationCategory": "{{ startup.categories[0] }}",
  "description": "{{ startup.one_line_pitch }}",
  "url": "{{ startup.url }}"
}
</script>
```

#### 2.5.3 Category page SEO

- Each category page includes H1, meta description, and structured list of startups
- Breadcrumb schema: `Home > Directory > [Category]`
- Internal linking between related category pages

---

### 2.6 Founder Dashboard

**Framework:** Next.js (SSR + client-side interactivity)
**Auth:** Session-based or JWT (email magic link for MVP)

#### 2.6.1 Dashboard sections

| Section | Content | Data source |
|---|---|---|
| Overview | KPI cards: impressions (7d), clicks (7d), CTR, reciprocity balance | `daily_metrics` aggregation |
| Match history | List of recently shown partners, impressions per partner | `impressions` + `startups` join |
| Reciprocity | Current balance, trend chart, estimated placement priority | `reciprocity_ledger` |
| Widget settings | Theme, format, position preview | `embed_instances` config |
| Trust status | Verification status, last re-crawl, trust score | `trust_signals` + current score |

---

## 3. API Contracts

### 3.1 Base URL

Production: `https://api.launchrelay.com/v1`
Staging: `https://api.staging.launchrelay.com/v1`

### 3.2 Endpoints

#### `POST /v1/startups` — Apply/onboard

**Request:**
```json
{
  "name": "My Startup",
  "url": "https://mystartup.com",
  "one_line_pitch": "AI-powered project management for remote teams",
  "categories": ["devtools", "productivity"],
  "email": "founder@mystartup.com"
}
```

**Response (201):**
```json
{
  "id": "uuid-abc-123",
  "status": "pending_review",
  "embed_code": "<script src=\"https://cdn.launchrelay.com/widget.js\" data-startup-id=\"uuid-abc-123\" async></script>",
  "created_at": "2026-07-16T10:00:00Z"
}
```

#### `GET /v1/match` — Get current match (called by SDK)

**Query params:** `startup_id` (required), `host_domain` (required)

**Response (200):**
```json
{
  "match": {
    "id": "uuid-xyz-789",
    "name": "Partner Startup",
    "one_line_pitch": "Description of partner",
    "url": "https://partners.com",
    "logo_url": "https://cdn.launchrelay.com/logos/uuid-xyz-789.png",
    "category": ["devtools"]
  },
  "impression_id": "imp-uuid-001",
  "styles_url": "https://cdn.launchrelay.com/widget/v1/bar-light.css",
  "expires_at": "2026-07-16T11:00:00Z"
}
```

**Response (204):** No match available (empty network)

#### `POST /v1/impressions` — Batch report impressions

**Request:**
```json
{
  "startup_id": "uuid-abc-123",
  "events": [
    {
      "impression_id": "imp-uuid-001",
      "verified": true,
      "timestamp": "2026-07-16T10:00:30Z",
      "viewport_duration_ms": 3500
    }
  ]
}
```

**Response (200):** `{ "accepted": 1 }`

#### `POST /v1/clicks` — Report a click

**Request:**
```json
{
  "startup_id": "uuid-abc-123",
  "impression_id": "imp-uuid-001",
  "timestamp": "2026-07-16T10:00:35Z"
}
```

**Response (200):** `{ "accepted": true }`

#### `GET /v1/dashboard/:startup_id` — Dashboard data

**Response (200):**
```json
{
  "startup_id": "uuid-abc-123",
  "overview": {
    "impressions_7d": 1250,
    "clicks_7d": 38,
    "ctr": 0.0304,
    "reciprocity_balance": 15
  },
  "reciprocity": {
    "balance": 15,
    "impressions_given": 245,
    "impressions_received": 230,
    "priority": "normal"
  },
  "recent_matches": [
    {
      "startup_id": "uuid-xyz-789",
      "name": "Partner Startup",
      "impressions": 42,
      "clicks": 3
    }
  ],
  "trust": {
    "score": 0.87,
    "last_verified_at": "2026-07-16T08:00:00Z",
    "status": "active"
  }
}
```

#### `GET /v1/directory` — List directory entries (public)

**Query params:** `category` (optional), `page` (default 1), `limit` (default 20)

**Response (200):**
```json
{
  "data": [
    {
      "slug": "my-startup",
      "name": "My Startup",
      "one_line_pitch": "Description",
      "categories": ["devtools"],
      "logo_url": "...",
      "joined_at": "2026-07-01"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

#### `GET /v1/directory/:slug` — Individual directory entry (public)

**Response (200):**
```json
{
  "slug": "my-startup",
  "name": "My Startup",
  "one_line_pitch": "Description",
  "url": "https://mystartup.com",
  "categories": ["devtools", "productivity"],
  "logo_url": "...",
  "joined_at": "2026-07-01",
  "trust_score": 0.87,
  "stats": {
    "impressions_30d": 5000,
    "clicks_30d": 150
  }
}
```

---

## 4. Data Model

### 4.1 Entity Relationship (core tables)

```sql
-- Startups
CREATE TABLE startups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  url             VARCHAR(2048) NOT NULL,
  slug            VARCHAR(255) UNIQUE NOT NULL,
  one_line_pitch  VARCHAR(280) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  logo_url        VARCHAR(2048),
  status          VARCHAR(32) NOT NULL DEFAULT 'pending',
  -- status enum: 'pending' | 'active' | 'paused' | 'delisted' | 'rejected'
  trust_score     DECIMAL(4,3) NOT NULL DEFAULT 0.500,
  verified_traffic_tier BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Startup categories (many-to-many)
CREATE TABLE startup_categories (
  startup_id  UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (startup_id, category_id)
);

-- Categories (with adjacency graph for cold-start widening)
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,
  slug        VARCHAR(120) UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Category adjacency (for cold-start category expansion)
CREATE TABLE category_adjacencies (
  category_id          UUID NOT NULL REFERENCES categories(id),
  adjacent_category_id UUID NOT NULL REFERENCES categories(id),
  similarity_weight    DECIMAL(3,2) NOT NULL DEFAULT 0.50,
  PRIMARY KEY (category_id, adjacent_category_id),
  CHECK (category_id <> adjacent_category_id)
);

-- Embed instances (one startup can embed on multiple domains)
CREATE TABLE embed_instances (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id        UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  host_domain       VARCHAR(255) NOT NULL,
  widget_format     VARCHAR(32) NOT NULL DEFAULT 'bar',
  widget_theme      VARCHAR(32) NOT NULL DEFAULT 'light',
  widget_position   VARCHAR(32) NOT NULL DEFAULT 'bottom',
  no_branding       BOOLEAN NOT NULL DEFAULT false,
  status            VARCHAR(32) NOT NULL DEFAULT 'active',
  -- status: 'active' | 'grace_period' | 'removed'
  first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (startup_id, host_domain)
);

-- Impressions
CREATE TABLE impressions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_startup_id UUID NOT NULL REFERENCES startups(id),
  shown_startup_id  UUID NOT NULL REFERENCES startups(id),
  embed_instance_id UUID NOT NULL REFERENCES embed_instances(id),
  verified          BOOLEAN NOT NULL DEFAULT false,
  viewport_duration_ms INTEGER,
  country           VARCHAR(2),
  device_type       VARCHAR(32),
  referrer          TEXT,
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_impressions_viewer ON impressions(viewer_startup_id, timestamp);
CREATE INDEX idx_impressions_shown ON impressions(shown_startup_id, timestamp);
CREATE INDEX idx_impressions_hourly ON impressions(DATE_TRUNC('hour', timestamp));

-- Clicks
CREATE TABLE clicks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  impression_id UUID NOT NULL REFERENCES impressions(id) ON DELETE CASCADE,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clicks_impression ON clicks(impression_id);

-- Reciprocity ledger
CREATE TABLE reciprocity_ledger (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id           UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  period_start         DATE NOT NULL,
  period_end           DATE NOT NULL,
  impressions_given    INTEGER NOT NULL DEFAULT 0,
  impressions_received INTEGER NOT NULL DEFAULT 0,
  balance              INTEGER NOT NULL DEFAULT 0,
  carryover_from_prev  INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_startup_period ON reciprocity_ledger(startup_id, period_start DESC);

-- Trust signals (audit log for trust score computation)
CREATE TABLE trust_signals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id  UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  signal_type VARCHAR(64) NOT NULL,
  -- types: 're_crawl_pass' | 're_crawl_fail' | 'grace_period_start' | 'delisted' |
  --        'manual_review_flag' | 'manual_review_cleared' | 'rate_limit_hit' |
  --        'verified_traffic_connected'
  metadata    JSONB,
  weight      DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trust_signals_startup ON trust_signals(startup_id, timestamp DESC);

-- Daily aggregated metrics (materialized for dashboard performance)
CREATE TABLE daily_metrics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id    UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  impressions   INTEGER NOT NULL DEFAULT 0,
  clicks        INTEGER NOT NULL DEFAULT 0,
  ctr           DECIMAL(6,5),
  UNIQUE (startup_id, date)
);
```

### 4.2 Reciprocity Ledger (monthly snapshots)

```
Each month:
1. Compute total verified impressions given by startup (within the month window)
2. Compute total impressions received by startup (within the month window)
3. balance_given = impressions_given - impressions_received
4. carryover = previous_period.carryover + previous_period.balance * 0.2
5. effective_balance = balance_given + carryover
```

**Carryover rule:** Only 20% of the previous period's balance carries forward. This prevents high-traffic sites from accumulating an insurmountable lead.

### 4.3 Matching engine cache table (materialized)

```sql
-- Precomputed match pairs, refreshed hourly
CREATE TABLE match_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_startup_id UUID NOT NULL REFERENCES startups(id),
  matched_startup_id UUID NOT NULL REFERENCES startups(id),
  score           DECIMAL(6,4) NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_cache_viewer ON match_cache(viewer_startup_id, score DESC);
```

---

## 5. Matching & Reciprocity Algorithm

### 5.1 Full scoring function

```typescript
interface MatchScore {
  candidate: Startup;
  score: number;
}

function scoreCandidate(
  candidate: Startup,
  requester: Startup,
  context: MatchContext
): number {
  const catSim = jaccardSimilarity(candidate.categories, requester.categories);
  const normBalance = normalizeBalance(candidate.currentBalance);
  const trust = candidate.trustScore;
  const diversityPenalty = computeDiversityPenalty(
    candidate.id,
    requester.id,
    context.recentMatches
  );
  const sizePenalty = computeSizeMismatch(
    candidate.trafficRank,
    requester.trafficRank,
    context.networkSize
  );

  const w = context.weights;

  return w.catSim * catSim
       + w.balance * normBalance
       + w.trust * trust
       - w.diversity * diversityPenalty
       - w.sizeMismatch * sizePenalty;
}
```

### 5.2 Candidate eligibility SQL

```sql
WITH eligible AS (
  SELECT s.*, lb.impressions_given, lb.impressions_received, lb.balance
  FROM startups s
  LEFT JOIN reciprocity_ledger lb ON lb.startup_id = s.id
  WHERE s.status = 'active'
    AND s.id <> :requester_id
    AND s.trust_score >= :min_trust_threshold
    AND EXISTS (
      SELECT 1 FROM startup_categories sc
      WHERE sc.startup_id = s.id
      AND (
        sc.category_id IN (:requester_category_ids)
        OR sc.category_id IN (
          SELECT adjacent_category_id
          FROM category_adjacencies
          WHERE category_id IN (:requester_category_ids)
        )
      )
    )
    -- Exclude competitors
    AND s.id NOT IN (
      SELECT excluded_startup_id
      FROM competitor_exclusions
      WHERE startup_id = :requester_id
    )
    -- Diversity: not shown more than 5 times in last 7 days
    AND (
      SELECT COUNT(*) FROM match_cache mc
      WHERE mc.viewer_startup_id = :requester_id
        AND mc.matched_startup_id = s.id
        AND mc.created_at > NOW() - INTERVAL '7 days'
    ) < 5
)
SELECT * FROM eligible;
```

### 5.3 Reciprocity balance reset logic

```sql
-- Run on the 1st of every month via cron
BEGIN;
INSERT INTO reciprocity_ledger (
  startup_id, period_start, period_end,
  impressions_given, impressions_received, balance, carryover_from_prev
)
SELECT
  s.id,
  DATE_TRUNC('month', NOW())::date,
  (DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 day')::date,
  COALESCE(SUM(CASE WHEN i.viewer_startup_id = s.id THEN 1 ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN i.shown_startup_id = s.id THEN 1 ELSE 0 END), 0),
  COALESCE(
    SUM(CASE WHEN i.viewer_startup_id = s.id THEN 1 ELSE 0 END)
    - SUM(CASE WHEN i.shown_startup_id = s.id THEN 1 ELSE 0 END),
    0
  ),
  COALESCE(
    (SELECT (prev.balance * 0.2 + prev.carryover_from_prev)
     FROM reciprocity_ledger prev
     WHERE prev.startup_id = s.id
     ORDER BY prev.period_start DESC
     LIMIT 1),
    0
  )
FROM startups s
LEFT JOIN impressions i ON
  (i.viewer_startup_id = s.id OR i.shown_startup_id = s.id)
  AND i.verified = true
  AND i.timestamp >= DATE_TRUNC('month', NOW())
  AND i.timestamp < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
WHERE s.status = 'active'
GROUP BY s.id;
COMMIT;
```

---

## 6. Security & Anti-Gaming

### 6.1 Embed SDK security

| Concern | Mitigation |
|---|---|
| XSS via widget content | All content rendered via `textContent` (not `innerHTML`). API validates/sanitizes all text fields. |
| Host page manipulating widget | Shadow DOM in `closed` mode prevents host CSS/JS from reaching widget internals. |
| Widget used on unauthorized domain | Cross-domain check: SDK reports `host_domain`, API validates it matches a registered embed_instance. Unknown domains get no match. |

### 6.2 API security

| Concern | Mitigation |
|---|---|
| Impersonation (faking startup_id) | `GET /v1/match` validates `startup_id` signature via HMAC — each startup gets a signed token at embed snippet generation time; SDK includes it in requests. |
| Impression inflation | Rate limiting (50 req/min per IP). Batch events validated (max 20 per batch). Duplicate checks by `impression_id` (idempotency key). |
| Bot traffic | Viewport verification + minimum viewport duration (1s) + User-Agent filtering. |
| Click fraud | Only count clicks that map to a verified impression. Rate limit clicks per impression (max 1). |

### 6.3 Rate limiting

| Endpoint | Limit | Scope |
|---|---|---|
| `GET /v1/match` | 10/min | Per startup_id |
| `POST /v1/impressions` | 60/min | Per startup_id (spike-compatible for high-traffic sites) |
| `POST /v1/clicks` | 30/min | Per startup_id |
| `POST /v1/startups` | 1/day | Per IP (prevent spam applications) |

### 6.4 Competitor exclusion

```sql
CREATE TABLE competitor_exclusions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id            UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  excluded_startup_id   UUID REFERENCES startups(id),
  excluded_category_id  UUID REFERENCES categories(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Must have at least one exclusion target
  CHECK (
    (excluded_startup_id IS NOT NULL)::integer
    + (excluded_category_id IS NOT NULL)::integer = 1
  )
);
```

---

## 7. Infrastructure & Deployment

### 7.1 Stack recommendation

| Layer | Technology | Rationale |
|---|---|---|
| Embed SDK | TypeScript → esbuild → IIFE | Zero dependencies, tiny bundle, broad browser support |
| API Gateway | Fastify (Node.js) | High throughput, schema validation via TypeBox |
| Matching Engine | Node.js or Go | Stateless, cache-heavy — both work well; Node.js chosen for team alignment |
| Analytics Ingest | Fastify + Redis Stream | Fast write path, buffered for batch DB inserts |
| Background Jobs | BullMQ + Redis | Re-crawl queue, ledger reset cron, trust score recalculation |
| Database | PostgreSQL 15+ | Relational data, ledger, aggregations |
| Cache | Redis 7 | Match cache, rate limiter, session store |
| Frontend (Dashboard + Directory) | Next.js 14 (App Router) | ISR for directory, SSR for dashboard, unified codebase |
| CDN | Cloudflare or Vercel Edge | Widget CSS/JS assets, directory cache, logo images |
| Hosting | Vercel (frontend) + Railway/Render (API + workers) | Matched stack, minimal ops overhead |
| Object Storage | S3-compatible (R2 or Backblaze) | Startup logos |

### 7.2 Deployment architecture

```
                     ┌──────────────┐
                     │   Cloudflare  │
                     │   CDN + DNS   │
                     └──────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
       ┌──────▼──────┐ ┌───▼────┐ ┌─────▼──────┐
       │  Vercel     │ │  API   │ │  CDN       │
       │  (Frontend) │ │  Servers│ │  (Assets)  │
       └──────┬──────┘ └───┬────┘ └────────────┘
              │            │
              └─────┬──────┘
                    │
         ┌──────────┴──────────┐
         │     PostgreSQL      │
         │     (Primary)       │
         └──────────┬──────────┘
                    │
         ┌──────────┴──────────┐
         │   PostgreSQL Read   │
         │   Replica           │
         └─────────────────────┘
```

### 7.3 Monitoring & alerting

| Metric | Threshold | Action |
|---|---|---|
| `GET /v1/match` p95 latency | >300ms | Alert |
| `/widget.js` bundle size | >6KB gzipped | CI failure |
| Re-crawl success rate | <80% of attempted | Alert (potential network-wide embed churn) |
| Impression-to-click gap | CTR <0.5% sustained for 7 days | Investigate widget blindness |
| Reciprocity balance drift | >90% members with negative balance | Network imbalance — investigate |
| Error rate (any endpoint) | >1% of requests | Alert |

---

## 8. Testing Strategy

### 8.1 Test levels

| Level | Focus | Tools | CI stage |
|---|---|---|---|
| Unit | Scoring functions, validation logic, trust computation | Vitest / Jest | Pre-commit + CI |
| Integration | API endpoints, DB queries, matching engine pipeline | Supertest + testcontainers-postgres | CI |
| E2E | Full widget load → impression → click → dashboard reflection | Playwright | CI (staging) |
| Performance | Matching engine throughput, SDK bundle size, API latency | k6 (load test), Lighthouse (CLS) | Pre-release |
| Security | SQL injection, XSS, rate limiting bypass | Manual + automated scanning | Pre-release |

### 8.2 Unit test examples (scoring function)

```typescript
describe('MatchingEngine.scoreCandidate', () => {
  it('favors higher category similarity', () => {
    const highOverlap = score(catMatch('devtools'), catMatch('devtools'));
    const lowOverlap = score(catMatch('devtools'), catMatch('fintech'));
    expect(highOverlap).toBeGreaterThan(lowOverlap);
  });

  it('gives higher score to positive-balance candidates', () => {
    const positiveBalance = score(balance(100));
    const negativeBalance = score(balance(-100));
    expect(positiveBalance).toBeGreaterThan(negativeBalance);
  });

  it('applies diversity penalty for recently shown candidates', () => {
    const recent = score(recentlyShown(true));
    const notRecent = score(recentlyShown(false));
    expect(notRecent).toBeGreaterThan(recent);
  });

  it('excludes self from candidates', () => {
    const candidates = engine.getCandidates(startupA);
    expect(candidates.find(c => c.id === startupA.id)).toBeUndefined();
  });
});
```

### 8.3 Integration test scenarios

```
Scenario: Full widget lifecycle
1. Register startup A via POST /v1/startups
2. Approve startup A (admin)
3. Register startup B, approve
4. Request match for A → receive B
5. Report impression for A→B match
6. Report click for same impression
7. Verify dashboard for A shows +1 impression, +1 click
8. Verify dashboard for B shows +1 impression received

Scenario: Re-crawl detects removed embed
1. Register startup, approve, create embed_instance
2. Run recrawl (mock startup URL to return HTML without script tag)
3. Verify embed_instance status → 'grace_period'
4. Run recrawl again after 7 days (simulated)
5. Verify startup status → 'delisted'
```

### 8.4 Load testing (k6)

```javascript
// Target: 1000 concurrent startups requesting matches
// Expected: p95 latency <200ms
export const options = {
  stages: [
    { duration: '1m', target: 100 },
    { duration: '3m', target: 1000 },
    { duration: '1m', target: 0 },
  ],
};
export default function () {
  const startupId = randomStartupId();
  http.get(`${BASE_URL}/v1/match?startup_id=${startupId}&host_domain=example.com`);
}
```

---

## 9. Performance Budgets & SLAs

| Metric | Budget | Measurement |
|---|---|---|
| Embed SDK bundle (gzipped) | <5KB | Build output check |
| Widget render time | <50ms (from script execution to visible) | Lighthouse, RUM |
| Cumulative Layout Shift caused by widget | 0.0 (reserved slot) | Lighthouse |
| `GET /v1/match` p50 latency | <50ms | APM |
| `GET /v1/match` p95 latency | <200ms | APM |
| `POST /v1/impressions` p95 latency | <100ms | APM |
| Dashboard page load (SSR) | <500ms TTFB | RUM |
| Directory page TTFB | <100ms (CDN-cached) | RUM |
| Re-crawl job throughput | 5000 members/hour | Monitoring |
| API uptime SLA | 99.9% (internal target) | Monitoring |
| Max events lost on crash | <1% (persist to Redis stream) | Integration test |

---

## 10. Open Technical Questions

1. **SDK versioning strategy:** How to handle breaking changes to the widget format without requiring every member to re-paste their embed snippet? (Proposal: version the CDN path: `/widget/v1/`, `/widget/v2/`. Old snippets continue to work with their pinned major version.)

2. **Logo storage:** Accept URLs (hotlink from startup's site) or upload? (Proposal: Accept both. If URL provided, CDN-proxy it; if upload, store in R2. Provides fallback avatar if neither.)

3. **Matching engine cold cache:** On first deploy or after a cache flush, how to warm the match cache without a stampede? (Proposal: Deploy with a warm-up script that iterates active startups and pre-computes their top-5 matches over a 5-minute window.)

4. **Foreign-key from impressions to startups:** Are we comfortable with potential DB constraint issues when a startup is deleted mid-month? (Proposal: Soft-delete only; `status = 'delisted'` instead of `DELETE`. FK constraints are fine.)

5. **Privacy considerations:** The embed collects referrer and device info. Do we need cookie consent / GDPR implications? (Proposal: The SDK sets no cookies, stores no localStorage, and collects only what's sent in the beacon. This is analytics-adjacent but arguably falls under legitimate interest. Get legal review before EU launch.)

---

## Appendix A — SDK Embed Code Generation

When a startup is approved, generate their embed snippet:

```typescript
function generateEmbedCode(startupId: string): string {
  const token = signToken({ startupId, domain: startup.domain }, EMBED_SECRET);
  return `<script
  src="${CDN_URL}/widget/v1.js"
  data-startup-id="${startupId}"
  data-token="${token}"
  data-theme="light"
  data-format="bar"
  data-position="bottom"
  async
></script>`;
}
```

The `data-token` is an HMAC-signed payload: `HMAC-SHA256(EMBED_SECRET, startupId + ":" + domain)`. The matching API verifies this token before returning a match, preventing unauthorized sites from consuming the API.

## Appendix B — Cold start schedule (detailed)

| Week | Action | Target members |
|---|---|---|
| W1 | Identify 300 indie founders (IH, BetaList, Microns, niche communities) | 0 |
| W2 | Personal outreach + onboard first 30 manually | 30 |
| W3 | Category graph tuning based on actual member distribution; onboard 50 more | 80 |
| W4 | Verify matching quality; onboard 70 more through referral | 150 |
| W5 | Public launch (Product Hunt, Indie Hackers post, X launch thread) | 300+ |

During W1–W4: category matching is relaxed (adjacency weight = 0.8), diversity penalty is disabled, and admin override is actively used.

---

*End of TDD v1 — 2026-07-16*
