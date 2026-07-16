CREATE TABLE conversions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    impression_id     UUID NOT NULL REFERENCES impressions(id) ON DELETE CASCADE,
    viewer_startup_id UUID NOT NULL REFERENCES startups(id),
    shown_startup_id  UUID NOT NULL REFERENCES startups(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (impression_id)
);

CREATE INDEX idx_conversions_viewer ON conversions(viewer_startup_id, created_at DESC);
CREATE INDEX idx_conversions_shown ON conversions(shown_startup_id, created_at DESC);
