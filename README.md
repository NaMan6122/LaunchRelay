# LaunchRelay — Reciprocal Traffic for Indie Founders

LaunchRelay is a free, reciprocal traffic-exchange network for indie founders and small SaaS teams. Embed a tiny widget on your site that shows another founder's startup, and yours gets shown on theirs in return. Zero ad spend, zero content grind — just a one-line script tag.

---

## The Problem

Early-stage founders have almost no cheap, low-effort way to get their first real visitors.

- **Paid ads** require budget and CAC math most side projects can't justify pre-revenue
- **SEO and content** take months before they produce meaningful traffic
- **Cold outreach** doesn't scale and feels spammy
- **Community launches** (Product Hunt, Indie Hackers) give one-time spikes, not sustained flow

There's a gap between "zero visitors" and "enough traffic to validate a product" — and nothing fills it cheaply.

## The Solution

The core mechanic is simple and proven: you display another founder's startup on your site, and yours appears on theirs. Every impression is reciprocal by design — the network only works when everyone participates.

**But not all traffic exchanges are equal.** Most classic traffic exchanges suffered from quality collapse — irrelevant matches, bot clicks, and members who join, get listed, then quietly remove the embed. LaunchRelay was built from day one to avoid that fate with three safeguards:

1. **Relevance** — category-aware matching ensures your widget shows startups in related spaces, not random sites
2. **Fairness** — traffic-weighted reciprocity means members who send more real traffic earn proportionally more back (not a flat 1:1 count)
3. **Trust** — automated re-crawling detects removed embeds, grace-periods honest mistakes, and de-lists members who stop participating

---

## How It Works

1. **Apply** with your startup's URL, one-line pitch, and category tags
2. **Embed** the one-line script tag into your site's HTML (or Webflow, WordPress, Shopify — it works everywhere)
3. **Earn** impressions as other founders see your startup in their widget
4. **Send** impressions as your visitors see other startups in your widget
5. **Monitor** everything in your dashboard — impressions, clicks, CTR, reciprocity balance, trust status

The matching engine automatically selects the best-fit partner for your site at any given moment, balancing category relevance, reciprocity balance, trust score, and diversity to avoid showing the same startup repeatedly.

---

## Widget Formats

LaunchRelay ships in three formats, all configured through the same embed snippet:

### Bar
A fixed 48px bar at the top or bottom of the viewport. Shows the partner's name, pitch, and a "Learn More" CTA. Best for maximum visibility — stays pinned as visitors scroll.

### Badge
A small 64×64 circular badge in the corner. On hover or click, it expands to reveal the full partner card with pitch and CTA. Minimal footprint, works well on content-heavy pages.

### Card
An inline horizontal card that sits in the page's natural content flow. 100% width, responsive, no fixed positioning. Designed for blog sidebars, footer areas, or "supported by" sections.

All three formats support light and dark themes, configurable positioning, and an optional no-branding mode.

---

## Key Features

| Feature | Description |
|---|---|
| **One-line embed** | Drop-in script tag, zero layout shift, async loading |
| **Shadow DOM isolation** | Widget styles never leak into your page, and vice versa |
| **Category matching** | Startups matched within related categories — no random cross-niche pairing |
| **Viewport tracking** | Impressions only count after 1s of continuous visibility (IntersectionObserver) |
| **Reciprocity ledger** | Monthly snapshots with 20% carryover — traffic is weighted, not flat 1:1 |
| **Click tracking** | Every outbound click recorded, max 1 per impression |
| **UTM auto-tagging** | All outbound links tagged for your analytics |
| **Auto re-crawl** | Daily verification that the embed is still present; grace period + de-listing on removal |
| **Trust scoring** | Domain age + recrawl pass rate + review flags → 0–1 trust score |
| **Rate limiting** | Anti-fraud: 10 req/min match, 60 req/min impressions, 30 req/min clicks |
| **Competitor exclusion** | Opt out of matching with specific startups or categories |
| **Public directory** | SEO-indexable pages for every startup, filterable by category |
| **Dashboard** | 7-day KPIs, match history, reciprocity balance, trust status, embed code |

---

## Architecture

```
┌──────────────────────┐         ┌──────────────────────────────────────┐
│   Your Website       │         │          LaunchRelay Platform        │
│  ┌────────────────┐  │         │                                      │
│  │  Embed SDK      │──┼───────▶│  ┌────────────┐  ┌──────────────┐   │
│  │  (widget)       │  │         │  │  Matching  │  │  Analytics   │   │
│  └────────────────┘  │         │  │  Engine    │  │  Pipeline    │   │
│                      │         │  └──────┬─────┘  └──────┬───────┘   │
│  ┌────────────────┐  │         │         │               │           │
│  │  Dashboard     │◀─┼─────────│  ┌──────▼─────┐  ┌─────▼──────┐    │
│  └────────────────┘  │         │  │  Trust &   │  │  Public    │    │
│                      │         │  │  Fraud     │  │  Directory │    │
└──────────────────────┘         │  │  Layer     │  │  (HTML)    │    │
                                 │  └────────────┘  └────────────┘    │
                                 │                                      │
                                 │  ┌──────────────────────────────┐   │
                                 │  │  PostgreSQL + Job Queue      │   │
                                 │  └──────────────────────────────┘   │
                                 └──────────────────────────────────────┘
```

### Components

- **Embed SDK** — TypeScript IIFE (<3KB gzipped), zero dependencies, async-loaded. Renders inside closed Shadow DOM. Tracks impressions via IntersectionObserver, batches beacons via `sendBeacon`.
- **Matching API** — Go + chi router. Category Jaccard similarity, tanh-normalized balance, trust score, diversity penalty, top-k weighted random selection. Results cached for 1 hour.
- **Analytics Pipeline** — Batch impression/click ingestion with idempotent dedup, daily metric aggregation.
- **Trust Layer** — Trust score computation (domain age + recrawl pass rate + flag deductions), in-memory rate limiting per endpoint.
- **Dashboard & Directory** — Server-rendered HTML templates (Go `html/template`), embedded via `go:embed`. No separate frontend build step.

---

## Quick Start (Local Development)

### Prerequisites

- Go 1.21+
- Docker (for PostgreSQL)
- `migrate` CLI (`brew install golang-migrate`)

### Run

```bash
./scripts/dev.sh
```

This starts PostgreSQL via Docker, runs migrations, and launches the API server on `:8080`.

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/v1/health` | Health check |
| `POST` | `/v1/startups` | Apply / onboard |
| `GET` | `/v1/startups/{id}` | Get startup details |
| `PATCH` | `/v1/startups/{id}` | Update startup status |
| `GET` | `/v1/match?startup_id=X&host_domain=Y` | Get current match (SDK) |
| `POST` | `/v1/impressions` | Batch impression events |
| `POST` | `/v1/clicks` | Record a click |
| `GET` | `/v1/categories` | List categories |
| `GET` | `/v1/startups/{id}/trust` | Compute trust score |
| `GET` | `/v1/dashboard/{startup_id}` | Dashboard JSON data |
| `GET` | `/v1/directory` | Public directory (JSON) |
| `GET` | `/v1/directory/{slug}` | Startup profile (JSON) |
| `GET` | `/dashboard/{startup_id}` | Dashboard HTML page |
| `GET` | `/directory` | Directory HTML page |
| `GET` | `/directory/{slug}` | Startup profile HTML page |
| `POST` | `/v1/admin/ledger/compute` | Compute monthly ledger |

### Testing

```bash
# Backend tests
cd backend && go test ./... -count=1

# SDK tests
cd sdk && node test/server.mjs &   # start test server
npx playwright test                 # run Playwright tests
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Embed SDK | TypeScript → esbuild → IIFE |
| API Server | Go, chi router, sqlx |
| Database | PostgreSQL 16 |
| Templates | Go `html/template` (embedded) |
| Container | Docker Compose |

---

## Project Structure

```
launchrelay/
├── backend/
│   ├── cmd/api/              # Main server entrypoint
│   ├── internal/
│   │   ├── api/              # Handlers, middleware, HTML templates
│   │   ├── db/               # PostgreSQL connection, migrations
│   │   ├── matching/         # Scoring engine
│   │   └── ledger/           # Reciprocity computation
│   └── docker-compose.yml
├── sdk/
│   ├── src/index.ts          # Widget source
│   ├── dist/widget.js        # Built bundle
│   ├── test/                 # Playwright tests + test server
│   └── scripts/build.js      # esbuild config
├── specs/                    # Atomic specs
├── scripts/dev.sh            # Start everything
└── Memory.md                 # Session tracking
```

---

## License

LaunchRelay is built as an open product. The core mechanic is free forever.
