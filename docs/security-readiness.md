# Hull Eats Security Readiness

## Completed in this pass

- Admin login moved from browser-side hardcoded checks to an API login endpoint
- Merchant hub login now validates credentials on the API
- Internal API routes for admin and merchant actions now require signed bearer tokens
- Hub passwords are now stored as hashes in the API registry instead of plaintext
- Secrets and bootstrap credentials moved into environment variables

## Current secure-by-default rules

- Never hardcode real admin or merchant passwords into frontend code
- Never store raw hub passwords in memory or database rows
- Only the API should validate internal credentials
- Admin and merchant routes must require authenticated tokens
- Customer-facing marketplace stays separate from internal control surfaces

## Still required before using real production data

1. Replace bootstrap admin credentials with real internal accounts
   - current env-based bootstrap admin is safer than hardcoded frontend login
   - but it should become a real stored admin identity next

2. Add audit logging
   - admin login attempts
   - hub creation
   - user creation
   - menu edits
   - import approvals

3. Add rate limiting and lockout rules
   - admin login
   - merchant login
   - sensitive write endpoints

4. Add secure file upload flow
   - storage bucket rules
   - file type checks
   - size limits
   - malware scanning later if needed

5. Add proper secret management in deployment
   - Render env vars only
   - no secrets in repo
   - rotate bootstrap and token secrets before launch

## Recommended next secure milestone

Persist internal admin identities and add audit/rate-limit protections around the now database-backed hub system.

The main blocker has moved from data persistence to operational hardening around who can sign in, what they can change, and how those changes are tracked.
