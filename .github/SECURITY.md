# Security Policy

## Supported Versions

NewsHub follows a continuous-deployment model on the `master` branch. Only
the latest deployed version receives security fixes. There are no LTS
branches.

| Version          | Supported          |
| ---------------- | ------------------ |
| `master` (live)  | :white_check_mark: |
| Pre-`master` SHAs | :x:                |

## Reporting a Vulnerability

**Please do NOT open public GitHub issues for security vulnerabilities.**

Use **GitHub Private Vulnerability Reporting**:
1. Go to https://github.com/ikarusXPS/NewsHubitat/security/advisories
2. Click **Report a vulnerability**
3. Provide a clear description, reproduction steps, and impact assessment

You should receive an acknowledgement within **3 business days** and a
preliminary assessment within **14 days**. We aim to disclose and patch
within **90 days** of the initial report, coordinated with the reporter.

## Scope

The following are **in scope**:

- Authentication & session handling (`apps/web/server/services/authService.ts`,
  JWT issuance, OAuth flows, password reset flows, email-verification flows)
- Authorization & rate limiting (`apps/web/server/middleware/`, tier gating,
  API key validation)
- Public API key handling (`apps/web/server/routes/publicApi.ts`,
  `X-API-Key` header, key hashing & rotation)
- Stripe billing integration (webhook signature verification, idempotency,
  price-ID whitelist enforcement)
- GDPR data-rights endpoints (`/api/account/export`, `/api/account/delete-request`)
- Cross-site scripting (XSS), SQL injection, SSRF, CSRF, path traversal,
  insecure deserialization
- Secrets handling — leaked secrets in logs, error messages, response bodies,
  source maps, or commit history

The following are **out of scope**:

- Denial-of-service attacks (we have rate limiting; volumetric DoS is
  expected to be handled at the CDN/edge layer)
- Social engineering, phishing, physical attacks
- Vulnerabilities requiring physical access to the server
- Third-party service issues (Stripe, OAuth providers, AI APIs) — please
  report those to the upstream provider
- Self-XSS that requires the victim to paste attacker-controlled content
  into DevTools
- Missing security headers on assets that don't carry user data
- Best-practice violations without a concrete exploit path (e.g., "your
  cookies don't have `__Secure-` prefix" without showing a session
  hijack scenario)

## Coordinated Disclosure

We commit to:
- Crediting reporters in release notes (unless anonymity is requested)
- Not pursuing legal action against good-faith security researchers who
  follow this policy
- Keeping reporters informed of remediation progress

## Bug Bounty

NewsHub does not currently operate a paid bug-bounty program. We can offer
public credit and (post-launch) merchandise.
