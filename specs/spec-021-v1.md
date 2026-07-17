# spec-021-v1: Public Startup Profile Pages (SSR)

**Status:** DRAFT
**Version:** 1
**Depends On:** spec-004 (Startup Management)
**Blocks:** NONE
**Task Reference:** T-021

## What

Replace the current client-rendered React SPA profile pages (`/directory/{slug}`) with server-rendered HTML for SEO. The server-rendered templates already exist in `html.go` (`handleProfileHTML`, `handleDirectoryHTML`) but are not wired to any route — the SPA shell handles those paths.

This spec wires the server-rendered templates to the directory routes, adds proper meta tags and JSON-LD structured data, and falls back to the SPA for logged-in interactions (dashboard).

## Acceptance Criteria

- Given a visitor (no auth), when they navigate to `/directory/{slug}`, then the page is server-rendered with full HTML including title tag, meta description, Open Graph tags, and JSON-LD structured data (SoftwareApplication schema)
- Given a visitor, when they view a directory page, then the HTML includes breadcrumb schema: `Home > Directory > {Category} > {Startup Name}`
- Given a visitor, when they navigate to `/directory`, then the page is server-rendered with paginated startup grid, category filter links, and proper meta tags
- Given a visitor, when they view a directory page on mobile, then the layout is responsive with proper viewport meta tag
- Given a search engine crawler, when it fetches `/directory/{slug}`, then the response includes all startup content in the initial HTML (not loaded via JS)
- Given a logged-in user who owns the startup, when they navigate to `/directory/{slug}`, then an "Edit Profile" link appears that links to the dashboard settings page
- Given a visitor requests an invalid slug, when loaded, then a 404 page is returned with proper HTTP status code

## Risks

Wiring SSR templates requires modifying the chi router to serve server-rendered content for unauthenticated requests and the SPA shell for dashboard routes. The `handleDirectoryHTML` and `handleProfileHTML` functions in `html.go` need to be registered and tested. The SPA and SSR templates should share the same CSS/design system.

## Rollback

Remove the SSR route registrations and revert to the SPA-only shell for all directory routes.
