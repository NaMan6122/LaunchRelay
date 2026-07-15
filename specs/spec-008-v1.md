# spec-008-v1: Trust & Fraud Layer

**Status:** DRAFT
**Version:** 1
**Depends On:** spec-003, spec-004
**Blocks:** NONE
**Task Reference:** T-008

## What

Implement the automated re-crawl job that periodically verifies each member's embed is still present, the trust score computation engine, and the rate limiting / fraud detection middleware. The manual review queue (admin dashboard) is a fast-follow.

## Acceptance Criteria

- Given a scheduled re-crawl tick, when a startup's embed is present on their site, then `last_verified_at` is updated and a `re_crawl_pass` trust signal is recorded
- Given a scheduled re-crawl tick, when a startup's embed is missing for the first time, then `embed_instance.status` is set to `grace_period` and a `grace_period_start` signal is recorded
- Given a startup has been in `grace_period` for ≥7 days, when the next re-crawl tick runs, then the startup's status is set to `delisted` and a `delisted` signal is recorded
- Given a startup with trust signals, when `GET /v1/startups/:id/trust` is called, then a trust score between 0 and 1 is returned, computed from: baseline 0.5, +0.01 per domain age day (capped at +0.1), ±0.3 based on 30-day re-crawl pass rate vs 80% baseline, -0.1 per active manual review flag
- Given an IP sends >50 impression requests per minute, then subsequent requests within the window return `429 Too Many Requests`
- Given a click relates to an impression that was already clicked, then it is discarded (max 1 click per impression)
- Given a startup is delisted, then it no longer appears in directory listings and is excluded from matching

## Risks

Re-crawl could be expensive at scale (5000+ members). Mitigate: staggered schedule, lightweight HTTP HEAD checks that verify script tag pattern via substring match rather than full DOM rendering.

## Rollback

Disable the re-crawl cron job. Trust scores freeze but don't regress. Rate limiting can be toggled off via config.
