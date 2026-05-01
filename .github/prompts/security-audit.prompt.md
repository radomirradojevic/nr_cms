---
name: Security Audit
description: "Audit the codebase for OWASP Top 10 vulnerabilities and project-specific security risks (open redirects, missing auth checks, unvalidated inputs, Drizzle ORM misuse). Use when reviewing Server Actions, route handlers, or the redirect route."
agent: ask
---

Perform a security audit on this Next.js project to detect vulnerabilities, misconfigurations, and risks. Focus on OWASP Top 10 issues and any project-specific concerns related to authentication, input validation, and database interactions. Provide detailed findings with severity levels and actionable fixes.

Next, ask  the user which issues they want to fix by either replying "all", or comma separating list of findings (e.g. "Finding 1, Finding 3, Finding 5"). After user replies, run separate sub-agent (#runSubagent) for each selected finding to generate a code fix, then each sub-agent should summarize all fixes in a final report with simple `subAgentSuccess: true` if all fixes were generated successfully, or `subAgentSuccess: false` if any fix failed to generate. The final report should include the generated code fixes for each finding and any additional recommendations for improving security in the codebase.

IMPORTANT: Always wait for user input before proceeding to the fix generation step.
Also, in Output format described below, replace `<path>` with the actual file path that links to the exact location of the issue and `<line>` with the line number(s) where the issue was found.
ALWAYS run Sub-agents per one finding, do not batch them together. This allows for more focused and accurate code fixes.


## Scope

Audit against the OWASP Top 10 with emphasis on the risks most relevant to this codebase:

1. **Open Redirect** — The `app/l/[shortcode]/route.ts` handler redirects users to stored URLs. Verify:
   - The destination URL is validated against an allowlist or at minimum checked for `javascript:`, `data:`, and protocol-relative `//` schemes before redirecting.
   - A malformed or missing shortcode returns a safe 404, not an unhandled error.

2. **Broken Access Control** — Every Server Action in `app/dashboard/actions.ts` and every route handler must:
   - Call `auth()` from `@clerk/nextjs/server` as the **first** statement.
   - Verify the authenticated `userId` owns the resource before reading, updating, or deleting it.
   - Return an error object on auth failure — never throw or expose stack traces.

3. **Injection (SQL / ORM)** — Drizzle ORM (`@/db`) uses parameterized queries by default, but check for:
   - Raw SQL strings built with string interpolation or template literals.
   - Dynamic column/table names constructed from user input.

4. **Input Validation** — Every Server Action must validate all inputs with Zod before any DB operation:
   - URL fields: `z.string().url()` — reject non-HTTP(S) protocols.
   - Slug/shortcode fields: enforce length and character allowlist (alphanumeric + `-`).
   - Confirm schemas are defined at the top of each `actions.ts` file.

5. **Security Misconfiguration** — Check:
   - `next.config.ts` does not expose source maps in production or disable security headers.
   - No secrets, API keys, or `CLERK_SECRET_KEY` values are committed or logged.
   - `proxy.ts` (middleware) enforces auth on `/dashboard(.*)` before the request reaches any page or action.

6. **Sensitive Data Exposure** — Verify:
   - Server Actions and route handlers never return raw DB rows with columns not needed by the client.
   - Error messages returned to the client are generic — no DB error details or stack traces.

7. **Insecure Direct Object References (IDOR)** — For link edit/delete actions, confirm the action fetches the record by both `shortcode`/`id` AND `userId` (not just the primary key), so users cannot mutate other users' links.

## Output Format

For each finding, report:

```
[SEVERITY: Critical | High | Medium | Low | Info]
File: <path>#L<line>
Issue: <one-sentence description>
Risk: <what an attacker could achieve>
Fix: <concrete code change or mitigation>
```

After listing all findings, provide a **Summary** section with:

- Total findings by severity
- The single highest-priority fix to apply first
- Any areas that appear secure and need no changes

If no argument was given, audit all files in `app/`, `data/`, and `proxy.ts`. Otherwise, focus only on the specified file or area.
