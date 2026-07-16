CREATE TABLE magic_link_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL,
    token       VARCHAR(64) NOT NULL UNIQUE,
    used        BOOLEAN NOT NULL DEFAULT false,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_magic_link_token ON magic_link_tokens(token);
CREATE INDEX idx_magic_link_email ON magic_link_tokens(email, created_at DESC);

CREATE TABLE auth_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL,
    startup_id  UUID REFERENCES startups(id) ON DELETE SET NULL,
    token       VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_token ON auth_tokens(token);
