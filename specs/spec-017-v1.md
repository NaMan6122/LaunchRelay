# spec-017-v1: Widget Customization Dashboard UI

**Status:** DRAFT
**Version:** 1
**Depends On:** spec-004 (Startup Management), AUTH-001
**Blocks:** NONE
**Task Reference:** T-017

## What

Provide a dashboard page where startup owners can preview and configure their embed widget — format (bar/badge/card), theme (light/dark), position (top/bottom), and no-branding mode — without re-pasting their embed snippet.

The embed code generator in `generateEmbedCode` currently returns a fixed snippet. This spec extends it to include all `data-*` attributes matching the user's saved preferences stored in `embed_instances`.

## Acceptance Criteria

- Given an authenticated user who owns a startup with at least one embed instance, when they navigate to `/dashboard/{id}/widget`, then the current configuration is displayed with format/theme/position/no-branding selectors and a live preview
- Given a user changes the format from "bar" to "badge", when saved, then the `embed_instances` row is updated and the embed code display updates to show the new `data-format="badge"` attribute
- Given a user has the "no-branding" toggle on, when they copy their embed code, then the generated snippet includes `data-no-branding`
- Given an authenticated user with no embed instances, when they visit the widget settings page, then they are shown a message to paste the embed snippet first, with a copyable code block
- Given an unauthenticated user, when they attempt to access `/dashboard/{id}/widget`, then they are redirected to login

## Risks

The embed format, theme, position, and no-branding columns already exist in `embed_instances` but the SDK doesn't currently read all of them from the match response. The SDK side may need a parallel update to respect the theme/format from the API response rather than only from `data-*` attributes.

## Rollback

Remove the widget settings route and revert `generateEmbedCode` to the fixed snippet. The SDK will fall back to its `data-*` attribute defaults.
