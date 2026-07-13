# Next.js Security Audit & OWASP Top 10 Remediation Guide

## Goal

Perform a deep security audit of this Next.js project, detect vulnerabilities, misconfigurations, and project-specific risks, then fix all confirmed issues in a controlled and minimal way.
While doing this, do not break or change any existing functionality, UX behavior, data structures, APIs, editor flows, page builder behavior, or public rendering unless a security fix absolutely requires it. If a security fix requires changing existing behavior, first explain why the change is necessary and apply the smallest possible safe change.

Focus especially on:

- OWASP Top 10
- Authentication and authorization
- Input validation
- Database interactions
- API routes / server actions
- File uploads
- Rich text / HTML rendering
- Admin/editor-only functionality
- Public frontend rendering
- Environment variables and secrets
- Dependency and supply-chain risks

---

## Important Rules

Do not rewrite the whole project.

Do not introduce large architectural changes unless a vulnerability cannot be fixed safely otherwise.

For every issue found:

1. Explain the vulnerability.
2. Explain the exact affected file/component/API route.
3. Explain the realistic impact.
4. Assign severity: Critical, High, Medium, Low.
5. Propose the safest fix.
6. Apply the fix only after understanding the root cause.
7. Verify the fix with tests, lint, typecheck, and runtime validation.

When in doubt, prefer secure defaults.

---

# Phase 1 — Project Security Mapping

First map the security-sensitive areas of the project.

Inspect:

- Next.js app routes
- API routes
- Server actions
- Middleware
- Authentication integration
- Authorization / RBAC logic
- Database schema and queries
- Form handling
- File upload handling
- TipTap editor usage
- Page builder rendering
- Raw HTML blocks
- Custom HTML slots
- Gallery rendering
- Form submission rendering
- Admin dashboard routes
- Public frontend routes
- Environment variable usage
- Dependency list

Produce an initial map with:

- Public routes
- Protected routes
- Admin-only routes
- API endpoints
- Server actions
- Database write paths
- User-generated content render paths
- HTML rendering paths
- File upload paths

---

# Phase 2 — OWASP Top 10 Audit

Audit the project against each OWASP Top 10 category.

## A01: Broken Access Control

Check for:

- Admin pages accessible by non-admin users
- API routes missing role checks
- Server actions missing authorization checks
- Direct object reference issues
- Users accessing or modifying resources they do not own
- Public access to editor/admin artifacts
- Hidden UI controls without backend enforcement
- Inconsistent RBAC between frontend and backend

Fix requirements:

- Enforce authorization on the server side.
- Never rely only on UI-level hiding.
- Add centralized helper functions for role/permission checks if needed.
- Return safe errors without leaking sensitive details.
- Verify admin/editor routes and APIs are blocked for unauthorized users.

Validation:

- Test unauthenticated access.
- Test authenticated non-admin access.
- Test admin access.
- Test direct API calls, not only UI flows.

---

## A02: Cryptographic Failures

Check for:

- Secrets committed to code
- Unsafe handling of API keys
- Sensitive data exposed to the browser
- Incorrect use of `NEXT_PUBLIC_`
- Tokens stored insecurely
- Sensitive values logged to console
- Weak password/token handling if applicable
- Insecure cookies if custom cookies exist

Fix requirements:

- Move secrets to environment variables.
- Only expose variables with `NEXT_PUBLIC_` when truly safe for browser usage.
- Remove sensitive logging.
- Use secure, httpOnly, sameSite cookies where applicable.
- Ensure production uses HTTPS-only cookies if custom auth cookies exist.

Validation:

- Search for hardcoded secrets.
- Check build output/client bundle exposure.
- Check `.env.example` contains placeholders only.

---

## A03: Injection

Check for:

- SQL injection risks
- Unsafe raw SQL
- Unsafe dynamic query construction
- Unsafe filters/sorting/search params
- HTML injection
- Command injection
- Unsafe use of user input in database queries
- Unsafe use of user input in redirects or URLs

Fix requirements:

- Use parameterized queries / ORM-safe query builders.
- Validate and normalize input before database usage.
- Whitelist sortable/filterable fields.
- Never concatenate user input into SQL.
- Sanitize HTML before rendering.
- Avoid passing user input into shell commands.

Validation:

- Inspect all DB query paths.
- Test malicious input in forms/search/filter params.
- Confirm queries remain parameterized.

---

## A04: Insecure Design

Check for:

- Missing security boundaries between admin/editor/public rendering
- Missing approval flows for dangerous content
- Unsafe default settings
- Overly permissive CMS configuration
- Lack of content sanitization policy
- Lack of rate limiting for sensitive actions
- Missing abuse prevention for comments/forms
- Unclear authority between legacy settings and appearance recipes

Fix requirements:

- Define safe defaults.
- Separate admin/editor artifacts from public rendering.
- Add security controls where the design requires them.
- Centralize sanitization and rendering rules.
- Ensure dangerous capabilities require admin permission.

Validation:

- Verify public frontend never exposes editor-only controls or metadata.
- Verify dangerous content is sanitized consistently.

---

## A05: Security Misconfiguration

Check for:

- Missing security headers
- Weak Content Security Policy
- Missing X-Frame-Options / frame-ancestors
- Missing X-Content-Type-Options
- Missing Referrer-Policy
- Missing Permissions-Policy
- Overly verbose errors
- Debug logs in production
- Exposed source maps if undesired
- Misconfigured CORS
- Publicly exposed internal routes

Fix requirements:

- Add or harden security headers in `next.config.js` or middleware.
- Use a strict but practical CSP.
- Avoid unsafe-inline where possible.
- Restrict CORS to trusted origins.
- Disable or control production debug output.
- Return generic production errors.

Recommended headers:

```ts
{
  key: "X-Content-Type-Options",
  value: "nosniff",
},
{
  key: "Referrer-Policy",
  value: "strict-origin-when-cross-origin",
},
{
  key: "X-Frame-Options",
  value: "DENY",
},
{
  key: "Permissions-Policy",
  value: "camera=(), microphone=(), geolocation=()",
}
```

For CSP, review actual project needs before applying. Do not blindly break scripts, images, fonts, or external services.

Validation:

- Verify headers in local and production-like runtime.
- Verify CSP does not break the CMS.
- Verify admin and public pages still work.

---

## A06: Vulnerable and Outdated Components

Check for:

- Vulnerable npm packages
- Outdated Next.js version
- Outdated auth/database/editor packages
- Vulnerable transitive dependencies
- Deprecated packages
- Unsafe package scripts

Fix requirements:

- Run dependency audit.
- Upgrade vulnerable packages carefully.
- Avoid breaking major upgrades unless necessary.
- Remove unused packages.
- Prefer maintained libraries.

Suggested commands:

```bash
npm audit
npm outdated
npm ls
```

or, depending on package manager:

```bash
pnpm audit
pnpm outdated
pnpm list
```

Validation:

- Re-run audit after upgrades.
- Run build/tests/lint/typecheck.
- Manually test editor and admin flows after dependency changes.

---

## A07: Identification and Authentication Failures

Check for:

- Incorrect Clerk/session usage
- Missing authentication on protected routes
- Inconsistent login enforcement
- Session data trusted without verification
- Public access to protected APIs
- Missing logout/session invalidation handling
- Auth state mismatch between server and client

Fix requirements:

- Enforce auth on server-side boundaries.
- Use trusted auth helpers.
- Do not trust client-provided user IDs or roles.
- Ensure admin APIs verify session and role.
- Ensure protected pages redirect or deny access properly.

Validation:

- Test logged-out user.
- Test normal logged-in user.
- Test admin user.
- Test forged request payloads.

---

## A08: Software and Data Integrity Failures

Check for:

- Unsafe dynamic imports
- Unsafely trusted serialized page builder data
- Unsafe persisted TipTap JSON/HTML
- Missing validation during import/export
- Package scripts that execute untrusted code
- Missing integrity checks for external scripts

Fix requirements:

- Validate serialized CMS content before rendering.
- Treat database content as untrusted.
- Sanitize and validate page builder JSON.
- Restrict allowed block types.
- Reject unknown or dangerous block payloads.
- Avoid external scripts unless explicitly trusted.

Validation:

- Test malformed page builder JSON.
- Test unknown block types.
- Test malicious persisted content.

---

## A09: Security Logging and Monitoring Failures

Check for:

- Missing logging for failed auth/access attempts
- Missing logging for admin mutations
- Missing logging for destructive actions
- Sensitive data in logs
- No audit trail for content changes if project requires it

Fix requirements:

- Log important security events without exposing secrets.
- Add minimal audit logging for admin actions if feasible.
- Log failed authorization attempts.
- Avoid logging tokens, cookies, passwords, API keys, or full sensitive payloads.

Validation:

- Trigger failed access attempts.
- Confirm safe logs are produced.
- Confirm secrets are not logged.

---

## A10: Server-Side Request Forgery

Check for:

- Any feature that fetches user-provided URLs
- Image import by URL
- Remote media ingestion
- Webhook URL calls
- Server-side preview fetching
- Metadata extraction from external URLs

Fix requirements:

- Block private/internal IP ranges.
- Allowlist trusted domains when possible.
- Validate protocols: only `https:` unless there is a strong reason.
- Set timeouts.
- Prevent redirects to internal addresses.
- Do not expose response bodies from internal services.

Validation:

- Test localhost, private IPs, metadata IPs, and internal hostnames.
- Confirm they are blocked.

---

# Phase 3 — Next.js-Specific Security Audit

Inspect:

- `middleware.ts`
- `next.config.js`
- `app/api/**`
- `app/**/page.tsx`
- `app/**/layout.tsx`
- server actions
- route handlers
- client/server component boundaries
- `dangerouslySetInnerHTML`
- image config
- redirects and rewrites
- dynamic route params
- search params
- cookies and headers usage

Check for:

- Server-only code accidentally imported into client components
- Sensitive data passed to client props
- Unsafe redirects
- Unsafe route params
- Missing `notFound()` or access checks for protected content
- Overly broad image remote patterns
- Public exposure of admin-only data

Fix requirements:

- Keep secrets and privileged logic server-side.
- Validate route params and search params.
- Sanitize all HTML before rendering.
- Restrict image domains.
- Add server-side access checks before rendering protected pages.

---

# Phase 4 — CMS-Specific Security Audit

Because this project is a CMS, pay special attention to user-generated and admin-generated content.

Inspect:

- TipTap editor content
- Page builder block serialization
- Raw HTML blocks
- Custom HTML header/footer slots
- CTA slot content
- Gallery blocks
- Form blocks
- Form submissions block
- Comments, if present
- File manager/uploads
- Public rendering of stored content

Check for:

- XSS through stored HTML
- XSS through attributes like `onerror`, `onclick`, `style`, `srcdoc`
- Unsafe iframe/embed handling
- Unsafe links using `javascript:` URLs
- Unsafe SVG upload/rendering
- Public rendering of editor-only wrappers
- Admin-only metadata leaking to frontend
- Form submissions exposing sensitive fields

Fix requirements:

- Centralize HTML sanitization.
- Use allowlist-based sanitization.
- Sanitize on render at minimum.
- Consider sanitizing on save as an additional layer.
- Strip dangerous attributes and protocols.
- Validate page builder JSON schema.
- Ensure public renderers only render public-safe components.
- Ensure form submission display respects configured visibility rules.

Validation payload examples:

```html
<img src=x onerror=alert(1)>
<script>alert(1)</script>
<a href="javascript:alert(1)">click</a>
<iframe srcdoc="<script>alert(1)</script>"></iframe>
<svg onload=alert(1)></svg>
```

Expected result:

- Scripts do not execute.
- Dangerous attributes are removed.
- Dangerous URLs are removed.
- Layout remains stable.
- Content still renders safely.

---

# Phase 5 — Database and API Security

Inspect:

- Database schema
- Drizzle queries or ORM usage
- API handlers
- Server actions
- Mutations
- Pagination
- Search
- Sorting
- Filtering
- Slug generation
- Content status transitions

Check for:

- SQL injection
- Missing validation
- Missing authorization
- Mass assignment
- Unsafe updates
- Unsafe deletes
- IDOR/BOLA issues
- Inconsistent published/draft visibility
- Draft content visible publicly
- Form submissions readable publicly without permission

Fix requirements:

- Validate request bodies with a schema validator where appropriate.
- Whitelist fields accepted from clients.
- Enforce role checks before mutations.
- Enforce ownership/permission checks before reads/writes.
- Ensure public queries only return published/public data.
- Use safe pagination limits.
- Validate UUIDs/slugs.

Validation:

- Try invalid IDs.
- Try accessing drafts publicly.
- Try editing content as non-admin.
- Try changing protected fields in request payload.
- Try extreme pagination values.

---

# Phase 6 — File Upload Security

Inspect file upload features if present.

Check for:

- Uploading executable files
- SVG with scripts
- HTML upload
- MIME spoofing
- Large files
- Path traversal
- Public access to private files
- Missing file size limits
- Missing file count limits
- Unsafe filename usage

Fix requirements:

- Restrict allowed MIME types and extensions.
- Enforce file size limits.
- Generate safe server-side filenames.
- Do not trust original filenames.
- Block or sanitize SVG unless explicitly supported safely.
- Store uploads in a controlled location/service.
- Validate files server-side, not only client-side.

Validation:

- Upload disallowed file types.
- Upload oversized files.
- Upload filename with path traversal characters.
- Upload spoofed MIME types.

---

# Phase 7 — Dependency, Build, and CI Security

Run:

```bash
npm audit
npm run lint
npm run typecheck
npm run build
npm test
```

If this project uses pnpm:

```bash
pnpm audit
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

Also check:

- Lockfile integrity
- Unused dependencies
- Deprecated packages
- Dangerous postinstall scripts
- Missing CI quality gates
- Advisory-only checks that should fail builds

Fix requirements:

- Security checks should fail CI for serious findings.
- Lint/typecheck/build/test should pass.
- Do not leave security checks as advisory-only if they protect production.

---

# Phase 8 — Fix Strategy

For every confirmed issue, use this fix workflow:

1. Identify root cause.
2. Classify severity.
3. Identify affected files.
4. Create minimal fix.
5. Add validation or test if practical.
6. Run lint/typecheck/build/tests.
7. Manually verify affected runtime flow.
8. Document what changed.

Do not batch unrelated risky fixes together.

Prioritize:

1. Critical XSS/auth/access-control issues
2. High-risk API/database issues
3. Misconfigurations
4. Dependency vulnerabilities
5. Maintainability/security hardening
6. Low-risk cleanup

---

# Phase 9 — Required Final Report

After the audit and fixes, produce a final report with this structure:

## Executive Summary

- Overall security posture
- Production readiness from security perspective
- Highest-risk areas found
- Whether the project is safe to deploy after fixes

## Findings by Severity

### Critical

For each:

- Title
- Affected files
- Description
- Impact
- Root cause
- Fix applied
- Validation performed
- Remaining risk

### High

Same structure.

### Medium

Same structure.

### Low

Same structure.

## OWASP Top 10 Coverage Matrix

| OWASP Category | Status | Notes |
|---|---|---|
| A01 Broken Access Control | Pass/Fail/Needs Review | ... |
| A02 Cryptographic Failures | Pass/Fail/Needs Review | ... |
| A03 Injection | Pass/Fail/Needs Review | ... |
| A04 Insecure Design | Pass/Fail/Needs Review | ... |
| A05 Security Misconfiguration | Pass/Fail/Needs Review | ... |
| A06 Vulnerable Components | Pass/Fail/Needs Review | ... |
| A07 Auth Failures | Pass/Fail/Needs Review | ... |
| A08 Integrity Failures | Pass/Fail/Needs Review | ... |
| A09 Logging/Monitoring Failures | Pass/Fail/Needs Review | ... |
| A10 SSRF | Pass/Fail/Needs Review | ... |

## Project-Specific CMS Risks

Include:

- Raw HTML handling
- TipTap rendering
- Page builder rendering
- File uploads
- Form submissions
- Custom slots
- Public/admin rendering separation
- Theme/appearance dynamic rendering risks

## Commands Run

List all commands executed and their result.

## Files Changed

List all changed files and explain why.

## Remaining Risks

List anything not fully fixed and why.

## Recommended Next Steps

Provide practical follow-up tasks.

---

# Final Instruction

Start with the audit.

Do not immediately change code until you have identified and categorized the issues.

After the initial findings are clear, fix issues in priority order.

At the end, the project must pass:

- lint
- typecheck
- build
- relevant tests
- manual runtime validation for security-sensitive flows
