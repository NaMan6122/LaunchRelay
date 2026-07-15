CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Startups
CREATE TABLE startups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    url             VARCHAR(2048) NOT NULL,
    slug            VARCHAR(255) UNIQUE NOT NULL,
    one_line_pitch  VARCHAR(280) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    logo_url        VARCHAR(2048),
    status          VARCHAR(32) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','active','paused','delisted','rejected')),
    trust_score     DECIMAL(4,3) NOT NULL DEFAULT 0.500,
    traffic_rank    INTEGER NOT NULL DEFAULT 1000,
    verified_traffic_tier BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    slug        VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Startup categories (many-to-many)
CREATE TABLE startup_categories (
    startup_id  UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (startup_id, category_id)
);

-- Category adjacency (for cold-start category expansion)
CREATE TABLE category_adjacencies (
    category_id          UUID NOT NULL REFERENCES categories(id),
    adjacent_category_id UUID NOT NULL REFERENCES categories(id),
    similarity_weight    DECIMAL(3,2) NOT NULL DEFAULT 0.50,
    PRIMARY KEY (category_id, adjacent_category_id),
    CHECK (category_id <> adjacent_category_id)
);

-- Embed instances
CREATE TABLE embed_instances (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id        UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    host_domain       VARCHAR(255) NOT NULL,
    widget_format     VARCHAR(32) NOT NULL DEFAULT 'bar',
    widget_theme      VARCHAR(32) NOT NULL DEFAULT 'light',
    widget_position   VARCHAR(32) NOT NULL DEFAULT 'bottom',
    no_branding       BOOLEAN NOT NULL DEFAULT false,
    status            VARCHAR(32) NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','grace_period','removed')),
    first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_verified_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (startup_id, host_domain)
);

-- Impressions
CREATE TABLE impressions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_startup_id   UUID NOT NULL REFERENCES startups(id),
    shown_startup_id    UUID NOT NULL REFERENCES startups(id),
    embed_instance_id   UUID NOT NULL REFERENCES embed_instances(id),
    verified            BOOLEAN NOT NULL DEFAULT false,
    viewport_duration_ms INTEGER,
    country             VARCHAR(2),
    device_type         VARCHAR(32),
    referrer            TEXT,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_impressions_viewer ON impressions(viewer_startup_id, timestamp);
CREATE INDEX idx_impressions_shown ON impressions(shown_startup_id, timestamp);

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

-- Trust signals
CREATE TABLE trust_signals (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id  UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    signal_type VARCHAR(64) NOT NULL,
    metadata    JSONB,
    weight      DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trust_signals_startup ON trust_signals(startup_id, timestamp DESC);

-- Daily aggregated metrics
CREATE TABLE daily_metrics (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id    UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    date          DATE NOT NULL,
    impressions   INTEGER NOT NULL DEFAULT 0,
    clicks        INTEGER NOT NULL DEFAULT 0,
    ctr           DECIMAL(6,5),
    UNIQUE (startup_id, date)
);

-- Match cache (precomputed pairs, refreshed hourly)
CREATE TABLE match_cache (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_startup_id UUID NOT NULL REFERENCES startups(id),
    matched_startup_id UUID NOT NULL REFERENCES startups(id),
    score             DECIMAL(6,4) NOT NULL,
    expires_at        TIMESTAMPTZ NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_cache_viewer ON match_cache(viewer_startup_id, score DESC);

-- Competitor exclusions
CREATE TABLE competitor_exclusions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id            UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    excluded_startup_id   UUID REFERENCES startups(id),
    excluded_category_id  UUID REFERENCES categories(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (excluded_startup_id IS NOT NULL)::integer
        + (excluded_category_id IS NOT NULL)::integer = 1
    )
);
