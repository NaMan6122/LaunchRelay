# LaunchRelay — Product Requirements Document

**Status:** Draft v1
**Owner:** Naman
**Date:** 2026-07-16
**Working name:** LaunchRelay *(placeholder — rename before build)*
**Category precedent:** LaunchRelay (LaunchRelay.co), classic web traffic exchanges (EasyHits4U, Traffic Ad Bar)

---

## 1. Overview & Problem Statement

Early-stage founders have almost no cheap, low-effort way to get their first real visitors. Paid ads require budget and CAC math most side projects can't justify pre-revenue. SEO and content take months. Cold outreach doesn't scale. Communities like Indie Hackers or Product Hunt give one-time spikes, not sustained flow.

LaunchRelay addresses this with a simple mechanic: embed a tiny bar showing another founder's startup, and yours gets shown on theirs in return. It's free, it's a one-line integration, and the audience is self-selecting (only founders embed it, so the traffic is inherently more relevant than generic ad traffic).

The mechanic is sound, but the implementation is shallow: it treats every exchange as equivalent (one bar for one bar), has no visible mechanism for relevance-matching or fraud prevention, offers a single fixed widget format, and gives shallow analytics. This creates a ceiling — the network gets noisy as it scales, because irrelevant matches and low-effort members dilute the value for everyone else.

**LaunchRelay takes the same free, reciprocal core mechanic and rebuilds it around three things LaunchRelay lacks: relevance (category-aware matching), fairness (traffic-weighted reciprocity instead of flat 1:1), and trust (active fraud/churn detection).**

---

## 2. Goals

- Give solo founders and small teams a genuinely free, zero-budget channel to acquire their first (and ongoing) traffic
- Make every exchange relevant by default — founders should rarely see a mismatched swap
- Make the exchange fair — a site sending more real traffic should get proportionally more back, not a flat 1:1 count
- Make the network trustworthy at scale — actively detect and remove members who stop honoring the exchange (removed embed, fake traffic, bot clicks)
- Ship an integration experience at least as frictionless as LaunchRelay's (one script tag, async, zero perceptible page-speed cost)
- Build a secondary, SEO-friendly discovery surface (a public directory) so the product creates value even for visitors who never see the embedded bar

## 3. Non-Goals (v1)

- Not building a general-purpose ad network or supporting paid placements in the MVP (may come later — see §13)
- Not supporting non-web platforms (mobile app cross-promotion, etc.) in v1
- Not attempting real-time bidding / auction-based placement — matching is rule-based and transparent, not an ad exchange
- Not building a full CRM or lead-gen suite — this is a top-of-funnel awareness tool, not a sales tool
- Not moderating startup content/legitimacy beyond automated + lightweight manual review — this isn't a curated "launch platform" like Product Hunt

---

## 4. Target Users & Personas

**Primary: Solo indie founder / side-project builder**
Pre-revenue or early-revenue, technical enough to paste a script tag, no marketing budget, wants steady low-effort traffic rather than one-time spikes. Cares about relevance (an audience of other builders, not random web traffic) and doesn't want their site cluttered with something that looks like an ad network.

**Secondary: Small SaaS team (2–10 people)**
Slightly more traffic already, wants incremental top-of-funnel volume without diverting engineering time. Cares more about analytics quality and about not looking "cheap" on their site — so widget polish and customization matter more to this persona.

**Tertiary: Accelerators / micro-VCs / dev-tool platforms (future monetization surface)**
Want visibility into a large, aggregated founder audience for sponsorship or portfolio cross-promotion. Not part of MVP scope but relevant to §13.

---

## 5. Competitive Landscape

| | Classic traffic exchanges (EasyHits4U, Traffic Ad Bar) | LaunchRelay | LaunchRelay (proposed) |
|---|---|---|---|
| Core mechanic | Manual "surf for credits" or rotating ad bar | Mutual embed, 1:1 | Mutual embed, weighted |
| Audience quality | Generic, often bot-heavy | Founders only (self-selecting) | Founders only + category-matched |
| Fairness model | Credit-per-view, pay-to-boost | Flat 1:1 embed-for-embed | Traffic-weighted reciprocity |
| Fraud/churn defense | Minimal, exploited heavily historically | Not disclosed publicly | Active re-crawl + verified-traffic option |
| Widget customization | Basic | Single fixed 36px bar | Multiple formats, themeable |
| Analytics | Credits/points only | Country, device, referrer, clicks | + conversion pixel, cohorts, UTM |
| Discovery beyond the widget | None | None | Public filterable directory |
| Monetization | Paid credit tiers, CPM ads | Free forever (stated) | Free core + optional non-intrusive paid boost |

**Key strategic takeaway:** the historical failure mode of traffic exchanges is *quality collapse* — once fraud and irrelevance creep in, the whole network's value craters (this is why "traffic exchange" carries a slightly dated, spammy connotation today). LaunchRelay's founder-only framing already fixes a lot of that, but without matching or churn detection it will likely face the same slow-quality-decay curve as it scales past its early, self-selected, well-behaved cohort. LaunchRelay's differentiation is entirely about avoiding that collapse.

---

## 6. Core Concept & Mechanics

1. A founder applies with their startup's URL, one-line pitch, and category tags.
2. On approval (automated checks + lightweight manual review for new/low-signal applicants), they receive an embed snippet.
3. Pasting the snippet on their site displays a small widget showing another network member's startup, chosen by the matching engine.
4. In exchange, their own startup becomes eligible to appear on other members' sites.
5. Impressions (viewport-visible only) and clicks are tracked per listing.
6. A **reciprocity score**, not a flat count, determines how much visibility a member earns back — see §10.
7. A background verification job periodically confirms the widget is still present on a member's site; removal triggers a grace period, then de-listing.
8. All members also appear in a public directory, independent of the widget rotation.

---

## 7. Feature Requirements

Organized by phase. **P0 = MVP (must ship to validate the core loop). P1 = fast-follow. P2 = later / conditional on traction.**

| Feature | Phase | Description |
|---|---|---|
| One-line async embed script | P0 | Drop-in `<script>` tag, zero layout shift, works on any stack (static HTML, Next.js, Webflow, WordPress) |
| Apply / onboarding flow | P0 | URL + pitch + category tags + basic automated legitimacy checks (domain age, working site, no obvious spam signals) |
| Category-based matching | P0 | Startups tagged with 1–3 categories (e.g. devtools, fintech, consumer, no-code); matching engine only pairs within/adjacent categories by default |
| Viewport-verified impression tracking | P0 | IntersectionObserver-based; only counts a view when the widget is actually visible |
| Click tracking | P0 | Basic click-through counting per listing |
| Traffic-weighted reciprocity | P0 | Visibility earned is proportional to verified impressions delivered, not raw embed count (full formula in §10) |
| Founder dashboard (basic) | P0 | Impressions, clicks, CTR, reciprocity score, current match |
| Automated re-crawl / churn detection | P0 | Periodic headless check that the script is still present; grace period + auto de-list on removal |
| Public directory | P1 | Browsable, filterable (by category) list of all network members; SEO-indexable pages per listing |
| Competitor exclusion | P1 | Members can flag categories/domains they don't want to be matched against |
| Multiple widget formats | P1 | Bar, corner badge, inline card — same underlying script, different `data-` attribute |
| Theming (light/dark, position, size) | P1 | Configurable via embed attributes, no re-integration needed |
| Richer analytics: country/device/referrer | P1 | Matches LaunchRelay's baseline analytics |
| Conversion pixel (optional) | P2 | Founders can optionally fire an event (signup, purchase) to see actual attributed conversions, not just clicks |
| UTM auto-tagging | P2 | Outbound links automatically tagged for the destination site's own analytics |
| Verified-traffic tier | P2 | Optional GA/Plausible/Search Console connection to confirm real baseline traffic, boosting matching weight/trust score |
| Reputation/reliability score (public) | P2 | Visible per-listing trust indicator, separate from raw reciprocity score |
| Copy/creative A/B testing | P2 | Multiple pitch variants rotated, best performer auto-promoted |
| Webhook / Zapier export | P2 | Push impression/click/conversion events to external tools |
| Paid boost tier | P2 | Optional non-intrusive priority placement within relevant categories (see §13) |
| Sponsor slots (accelerators/VCs) | P2 | Separate inventory, clearly labeled as sponsored, doesn't compete with organic founder-to-founder slots |

---

## 8. System Architecture

Four logical components, deliberately kept decoupled so each can be built, tested, and scaled independently:

**8.1 Embed SDK (client-side)**
A small, dependency-free JS loader (target: under 5KB gzipped) that:
- Loads asynchronously and never blocks paint
- Reserves a fixed-height slot to avoid Cumulative Layout Shift
- Fetches the current match from the API (with short client-side caching to reduce request volume)
- Renders the widget in a Shadow DOM to isolate styles from the host page
- Instruments impressions via IntersectionObserver and clicks via a standard event listener
- Sends batched, low-frequency beacons for tracking (avoid firing a network request per interaction)

**8.2 Matching engine (backend service)**
Given a requesting startup ID, returns the best-fit partner to display, based on:
- Category overlap (primary filter)
- Reciprocity balance (favor partners you currently "owe" visibility to, and who owe you)
- Trust score (deprioritize low-trust or newly-onboarded-but-unverified members from prime slots)
- Recency/diversity (avoid showing the same partner repeatedly to the same site's visitors)
Runs as a stateless service behind a cache layer; matches can be precomputed periodically (e.g. hourly) rather than calculated on every request, since near-real-time freshness is not required.

**8.3 Trust & fraud layer**
- Impression/click validation: rate limiting per IP/session, basic bot signature filtering, discarding impressions from non-viewport or headless-browser-like patterns
- Scheduled re-crawl job: periodically fetches each member's site and confirms the embed script is present and requesting from the expected domain; absence triggers a grace-period notification, then automatic de-listing
- Manual review queue: flags new or anomalous accounts (sudden traffic spikes, mismatched domain/category, etc.) for lightweight human review

**8.4 Analytics & dashboard**
- Ingests impression/click/conversion events from the SDK
- Aggregates into per-listing metrics (impressions, clicks, CTR, reciprocity balance, trust score, country/device/referrer breakdown)
- Serves the founder-facing dashboard and (later) exports via webhook/API

**8.5 Public directory**
- Statically generated or ISR-rendered pages per listing and per category, for SEO value and passive discovery independent of the widget rotation

---

## 9. Data Model (initial entities)

- **Startup**: id, name, url, one-line pitch, categories[], status (pending/active/paused/delisted), trust_score, created_at
- **EmbedInstance**: id, startup_id, host_domain, first_seen_at, last_verified_at, status (active/grace_period/removed)
- **Impression**: id, viewer_startup_id (whose site it appeared on), shown_startup_id, timestamp, verified (bool), country, device
- **Click**: id, impression_id (FK), timestamp
- **ReciprocityLedger**: startup_id, impressions_given, impressions_received, running_balance
- **Category**: id, name, parent_category_id (nullable, for hierarchy)
- **TrustSignal**: startup_id, signal_type (e.g. re_crawl_pass, re_crawl_fail, manual_review_flag), timestamp, weight

---

## 10. Matching & Reciprocity Algorithm (v1 spec)

Rather than a flat "one embed = one placement," each startup accrues a **reciprocity balance**:

```
balance = impressions_given (verified) - impressions_received
```

- A startup with a positive balance (giving more than it receives) is prioritized for placement on other sites — it's "owed" visibility.
- A startup with a negative balance is deprioritized until it catches back up.
- This naturally rewards high-traffic members (they generate more verified impressions for others, so they earn proportionally more back) without requiring an explicit bidding or payment system.

Matching score for candidate partner *P* on requesting site *R*:

```
score(P, R) = w1 * category_overlap(P, R)
            + w2 * normalize(balance(P))
            + w3 * trust_score(P)
            + w4 * diversity_penalty(P, R)   // negative term, avoids repeat-showing
```

Initial suggested weights: `w1 = 0.4, w2 = 0.3, w3 = 0.2, w4 = 0.1` — tune based on early network CTR data. This should be treated as a tunable config, not hardcoded, from day one.

---

## 11. Trust & Anti-Gaming Strategy

Threats to design against explicitly:

- **Embed churn** (join, get listed, remove the script): mitigated by scheduled re-crawl + grace period + auto de-list
- **Fake/bot traffic** to inflate impressions or clicks: mitigated by viewport-verification, rate limiting, and (optionally) requiring a connected analytics account for members who want higher matching priority
- **Sock-puppet startups** (fake listings just to consume network placement without real traffic): mitigated by minimum-traffic thresholds before a listing is eligible to receive placements, and by manual review flags on anomalous new accounts
- **Category gaming** (mis-tagging to get matched with unrelated but higher-traffic categories): mitigated by periodic audit sampling and community flagging (report-mismatch button on the directory)

---

## 12. Analytics & Reporting (founder-facing)

MVP dashboard shows, per listing:
- Impressions (verified) and clicks, with CTR
- Current reciprocity balance and what that means for placement priority
- Current matched partner(s)
- Trust/verification status

Later phases add country/device/referrer breakdowns, conversion attribution (optional pixel), and exportable data.

---

## 13. Monetization Strategy (future, not MVP)

The free 1:1-style core loop must remain free forever — it's the trust anchor of the whole product, and monetizing it directly would undermine the "founders helping founders" positioning that makes the audience valuable in the first place.

Future non-intrusive monetization surfaces:
- **Paid boost**: priority placement within a founder's chosen categories, without displacing the free reciprocal slots — a founder can pay to be shown more often, not to skip the trust/verification requirements
- **Sponsor slots**: clearly labeled placements for accelerators, dev-tool platforms, or micro-VCs wanting reach into a founder audience — kept in a separate, clearly distinguished inventory from organic peer listings
- **Verified-traffic tier**: optional paid analytics integration (deeper reporting) for teams that want more than the free dashboard

---

## 14. Success Metrics / KPIs

- **Network health**: active embed count, re-crawl pass rate (% of members still actually embedding), median reciprocity balance drift
- **Engagement**: network-wide CTR, average impressions per listing per week
- **Quality**: % of impressions matched within the same or adjacent category, manual-review flag rate
- **Growth loop strength**: k-factor — how many new sign-ups each embedded widget itself generates (since the widget can link to an "apply" page)
- **Retention**: % of members still actively embedded 30/90 days after joining

---

## 15. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Cold start — too few members for good matches early on | Seed manually with a curated founder cohort before public launch; relax category strictness early, tighten as network grows |
| Quality collapse at scale (the historical failure mode of traffic exchanges) | Re-crawl + trust scoring + reciprocity weighting are all built in from day one, not bolted on later |
| Widget perceived as "ad-like," hurting site aesthetics/credibility | Multiple format/theme options in P1; keep default styling minimal and non-ad-like |
| Page-speed / CLS complaints | Reserved-height slot + async loading + Shadow DOM isolation, tested against Core Web Vitals from the start |
| Matching algorithm requires tuning that isn't obvious pre-launch | Treat weights as configurable, instrument heavily, plan for iteration rather than a "correct" launch config |

---

## 16. Phased Roadmap

**Phase 0 — Feasibility spike (1–2 weeks)**
De-risk the two hardest technical unknowns before committing to full build:
- Prototype the embed SDK's async load + Shadow DOM + viewport-impression tracking in isolation, confirm zero measurable CLS/page-speed impact on a test site
- Prototype the reciprocity/matching scoring function against a small synthetic dataset to sanity-check the weighting model before real users are involved

**Phase 1 — MVP (all P0 features)**
Embed SDK, apply flow, category matching, viewport impressions, click tracking, reciprocity ledger, basic dashboard, re-crawl/churn detection. Launch with a small manually-seeded cohort.

**Phase 2 (P1 features)**
Public directory, competitor exclusion, multiple widget formats/themes, richer analytics.

**Phase 3 (P2 features, conditional on traction)**
Conversion pixel, UTM tagging, verified-traffic tier, public trust score, A/B creative testing, webhook export, paid boost tier, sponsor slots.

---

## 17. Open Questions

- Should category tagging be founder-self-declared, algorithmically inferred (e.g. from site content), or both?
- What's the minimum viable manual-review process for new applicants — fully automated, or a human-in-the-loop gate for at least the first N members?
- Should the reciprocity ledger reset periodically (e.g. monthly) or run as a lifetime balance?
- Is a single global directory the right structure, or should there be separate directories per major category from the start?
- What's the right grace period length before de-listing a member whose embed disappears (accidental removal vs. intentional churn)?

---

## 18. Appendix — Suggested Tech Stack (non-binding)

- **Embed SDK**: vanilla JS, no framework dependency, Shadow DOM for style isolation, IntersectionObserver for viewport tracking
- **Matching engine**: stateless service, precomputed match cache refreshed on a schedule (e.g. hourly cron) rather than computed per-request
- **Data store**: relational DB (Postgres) for the reciprocity ledger and startup/category data; append-only event log (impressions/clicks) can go to a simpler time-series-friendly store if volume grows
- **Re-crawl job**: headless-browser or lightweight HTTP-check worker, scheduled (e.g. daily per member)
- **Directory pages**: statically generated or ISR, for SEO
