# npm Supply Chain Audit Report

Date: 2026-05-26
Project: `nr_cms`

## Executive Summary

The project had no `npm audit` findings and no lockfile entries resolving outside the npm registry. The main risks were operational: floating direct dependency ranges, CLI-only packages installed as production dependencies, and local AI hook scripts that could execute `npx` or persist sensitive tool output.

Applied fixes were intentionally minimal: current locked versions were pinned exactly, npm project defaults were hardened, `shadcn`/`dotenv`/type-only packages were moved to dev-time classification, a project-owned supply-chain audit script was added, and local hook scripts were restricted.

## Findings By Severity

### High

1. Raw local tool-output logging could persist secrets.
   - File: `.github/hooks/log-tool-output.ps1`
   - Impact: AI/tool output can include tokens, environment values, request headers, or credentials; writing it unredacted to `logs/` creates workstation exposure.
   - Fix: logging is now opt-in via `AGENT_TOOL_OUTPUT_LOGGING=1` or `true`, capped at 200 KB, and redacts common token/private-key patterns.

2. Formatter hook used `npx prettier --write .`.
   - File: `.github/hooks/format-on-replace.ps1`
   - Impact: `npx` may fetch/execute package code if local resolution fails, and formatting the whole repo after file edits increases blast radius.
   - Fix: the hook now uses `node_modules/.bin/prettier.cmd`, resolves only changed file paths inside the project root, and skips unsupported paths.

### Medium

3. Direct dependency ranges allowed future poisoned updates when the lockfile is refreshed.
   - File: `package.json`, `package-lock.json`
   - Impact: caret/range specs increase exposure to compromised patch/minor releases during updates.
   - Fix: direct dependencies and devDependencies were pinned to the currently locked versions; `.npmrc` now sets `save-exact=true` and an empty `save-prefix`.

4. CLI-only `shadcn` dependency pulled dev/AI-adjacent tooling into production installs.
   - File: `package.json`, `package-lock.json`
   - Impact: `shadcn` brought `msw` and `@modelcontextprotocol/sdk` into the production dependency graph even though the package is build/tooling only.
   - Fix: `shadcn` is now a devDependency. `npm ls shadcn @modelcontextprotocol/sdk msw --omit=dev` returns an empty tree.

5. No project-local npm hardening config existed.
   - File: `.npmrc`
   - Impact: developers could accidentally save ranges, omit lockfiles, or install with different peer resolution behavior.
   - Fix: added npm registry, lockfile, exact-save, strict-peer, audit, and lockfile metadata defaults.

### Low

6. The lockfile omits `resolved`/`integrity` metadata for many package entries.
   - File: `package-lock.json`
   - Impact: npm can still install from the lockfile, but the committed metadata is less explicit for independent integrity review.
   - Fix: added `omit-lockfile-registry-resolved=false` and an audit warning. Remaining risk is tracked because npm did not backfill all metadata during lockfile sync.

### Info

- No `.github/workflows/*.yml` or Dockerfiles were present, so no unpinned GitHub Actions, over-broad workflow permissions, or CI secret usage were found in this workspace.
- No committed real secrets were found; matches were documentation placeholders or expected environment variable reads.
- Runtime hardening exists: CSP/security headers in `next.config.ts`, Clerk protection in `proxy.ts`, upload MIME sniffing/rate limits, and HTML/SVG sanitization.
- Eight dependency install hooks remain in the lockfile and are now allowlisted by `npm run supply-chain:audit`.

## Dependency Risk Matrix

| Area | Packages | Risk | Current Status |
| --- | --- | --- | --- |
| Rich text/editor | `@tiptap/*`, `@codemirror/lang-html`, `highlight.js`, `lowlight`, `sanitize-html` | XSS or parser compromise affects CMS rendering | No audit findings; sanitizer and TipTap smoke checks exist |
| Auth | `@clerk/nextjs`, `@clerk/themes`, `@clerk/shared` | Auth package compromise or install-time telemetry notice | Locked; install hooks allowlisted |
| Native/build binaries | `sharp`, `esbuild`, `unrs-resolver`, `fsevents` | Binary/package lifecycle execution | Locked; lifecycle hooks allowlisted |
| CLI/tooling | `shadcn`, `drizzle-kit`, `tsx`, `prettier`, `eslint` | Dev machine and CI execution surface | `shadcn`, `msw`, MCP SDK now dev-only |
| Database/env | `pg`, `drizzle-orm`, `dotenv` | Credential handling and DB access | Runtime env remains server-side; `dotenv` is dev-only |

## Recent Incident Correlation

Checked package names and versions against recent npm supply-chain reporting:

- Qix/chalk/debug compromise, September 2025: no known malicious versions found (`debug@4.4.2`, `chalk@5.6.1`, related ANSI/color package versions).
- eslint-config-prettier compromise, July 2025: package not present.
- Axios compromise, March 2026: package not present.
- Mini Shai-Hulud reports, May 2026: no direct affected package evidence found in this lockfile during this audit.

Sources reviewed:

- https://threats.wiz.io/all-incidents/qix-npm-package-supply-chain-compromise
- https://www.stepsecurity.io/blog/20-popular-npm-packages-compromised-chalk-debug-strip-ansi-color-convert-wrap-ansi
- https://securitylabs.datadoghq.com/articles/axios-npm-supply-chain-compromise/
- https://www.microsoft.com/en-us/security/blog/2026/04/01/mitigating-the-axios-npm-supply-chain-compromise/
- https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Supply_chain_attacks

## CI/CD Security Findings

No GitHub Actions workflows were present. Recommended future CI baseline:

- Use `npm ci`, never `npm install`.
- Run `npm run supply-chain:audit`, `npm audit --audit-level=moderate`, `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`.
- If workflows are added, pin third-party actions by commit SHA and set minimal `permissions`.
- Prefer short-lived deployment credentials/OIDC over long-lived tokens.

## Workstation And AI Tooling Risks

- `.env*`, `logs/`, `.github/`, `.agents/`, and docs are ignored by git.
- Local hook logging is now opt-in and redacted.
- Local formatter hook no longer invokes `npx` or formats the whole repo.
- No checked-in MCP configuration was found; `@modelcontextprotocol/sdk` remains only as a dev transitive dependency of `shadcn`.

## Files Changed

- `.npmrc`
- `.github/hooks/format-on-replace.ps1`
- `.github/hooks/log-tool-output.ps1`
- `package.json`
- `package-lock.json`
- `scripts/audit-npm-supply-chain.ts`
- `docs/npm-supply-chain-audit-report.md`

## Remaining Risks

- The lockfile still has many entries without explicit `resolved`/`integrity` metadata; the audit script warns on this.
- Existing `overrides` use ranges for `esbuild` and `postcss`; left unchanged to avoid unintended resolver changes.
- No CI workflow exists to enforce these checks automatically.
- Dependency freshness was intentionally not remediated by upgrading packages.

## Validation

- `npm audit --audit-level=moderate`: passed, 0 vulnerabilities.
- `npm run supply-chain:audit`: passed with warnings for ranged overrides and omitted lock metadata.
- `npx tsc --noEmit --pretty false`: passed.
- `npx eslint`: passed.
- `npm run test`: passed, 34 tests.
- `npm ci --dry-run --ignore-scripts`: passed.
- `npm run build`: passed. Turbopack reported one warning about broad file tracing through `lib/file-storage.ts`.
- `npm ls shadcn @modelcontextprotocol/sdk msw --omit=dev`: empty production tree.
- `npm outdated --long`: reviewed; packages are intentionally pinned, so `Wanted` equals `Current` while newer `Latest` versions are deferred for compatibility review.
