# spec-018-v1: Email Delivery for Magic Links

**Status:** DRAFT
**Version:** 1
**Depends On:** spec-003 (Core Infrastructure)
**Blocks:** NONE
**Task Reference:** T-018

## What

Replace dev-mode-only magic link delivery with production-ready email sending via SendGrid or AWS SES. Currently `handleSendMagicLink` returns the link as a `debug` field in the API response and logs it. In production, it must send an email.

The email contains a "Log in to LaunchRelay" button linking to the magic link URL. The method selection (SendGrid vs SES) is driven by an environment variable.

## Acceptance Criteria

- Given the `EMAIL_PROVIDER=sendgrid` environment variable is set with a valid `SENDGRID_API_KEY`, when a user requests a magic link, then an email is sent to the provided address with a login button containing the magic link URL
- Given `EMAIL_PROVIDER=ses` with valid `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, when a user requests a magic link, then an email is sent via SES
- Given `DEV_MODE=true` (default), when a user requests a magic link, then the existing dev-mode behavior is preserved (debug URL in response, no email sent)
- Given an invalid email address, when a magic link is requested, then the API returns a 400 error (validated before attempting to send)
- Given the email provider returns an error, when the API attempts to send, then the API returns a 500 error and the token is rolled back (deleted)
- Given the email body, when rendered, then it contains: the startup name (if user has one), a styled "Log in" button linking to `{APP_URL}/login?token={token}`, and an expiry note (15 minutes)

## Risks

This introduces a dependency on an external email provider. If the provider is down or the API key is misconfigured, logins are blocked. SMTP-based fallback could be considered for robustness. The `APP_URL` origin must be correctly configured for the magic link to resolve.

## Rollback

Remove the email provider integration code and revert to the pure dev-mode flow. No schema changes required.
