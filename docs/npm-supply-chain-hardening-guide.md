# npm Supply Chain Attack Hardening & Remediation Guide
## For Next.js / CMS / CI-CD Projects

# Goal

Perform a deep supply-chain security audit of this project and harden it against modern npm ecosystem attacks, including:
- malicious npm packages
- compromised maintainers
- poisoned package updates
- malicious transitive dependencies
- dependency confusion
- typosquatting
- malicious postinstall scripts
- CI/CD token theft
- developer workstation compromise
- GitHub Actions compromise
- credential exfiltration
- malicious AI tooling integrations
- compromised package releases

The final goal is to make the project production-safe against modern npm supply-chain attack techniques.

# IMPORTANT RULES

Do NOT rewrite the project unnecessarily.
Do NOT blindly upgrade packages.
Do NOT break:
- CMS functionality
- APIs
- rendering behavior
- editor behavior
- page builder behavior
- serialization formats
- deployment flows
- CI/CD pipelines

Prefer minimal safe changes.

Before fixing anything:
1. identify root cause
2. identify exact affected dependency/workflow
3. explain realistic impact
4. classify severity
5. apply minimal fix
6. validate runtime behavior

# Phase 1 — Full Dependency Inventory

Audit:
- package.json
- lockfile
- pnpm/npm config
- build scripts
- Dockerfiles
- GitHub Actions
- CI/CD scripts
- VS Code workspace configs
- shell scripts
- install scripts
- postinstall scripts
- prepare scripts
- husky hooks

Create inventory of:
- direct dependencies
- transitive dependencies
- deprecated packages
- abandoned packages
- unmaintained packages
- packages with install scripts
- packages downloading binaries
- native modules
- suspicious packages
- packages with excessive permissions

# Phase 2 — Detect Malicious Install-Time Behavior

Inspect all dependencies for:
- postinstall scripts
- prepare scripts
- install hooks
- shell execution
- curl/wget usage
- PowerShell execution
- remote binary download
- credential harvesting
- token exfiltration

Search for suspicious patterns:
- child_process
- exec
- spawn
- eval
- Function()
- process.env
- ~/.ssh
- ~/.aws
- ~/.npmrc

# Phase 3 — Detect Compromised or High-Risk Packages

Identify:
- packages recently involved in supply-chain attacks
- suspicious maintainer changes
- suspicious release patterns
- abandoned packages
- suspicious obfuscation/minified install code

Pay special attention to:
- TipTap ecosystem
- markdown/html parsers
- syntax highlighters
- upload/image libraries
- auth libraries
- page builder libraries
- editor plugins

# Phase 4 — CI/CD & GitHub Actions Hardening

Audit:
- GitHub Actions workflows
- secrets usage
- workflow permissions
- reusable workflows
- deployment credentials
- npm tokens
- cloud credentials

Check for:
- overprivileged GitHub tokens
- unpinned GitHub Actions
- secret leakage
- dangerous pull_request_target usage
- unsafe workflow triggers

Fix requirements:
- pin GitHub Actions by SHA where possible
- minimize workflow permissions
- isolate deployment credentials
- use short-lived credentials

# Phase 5 — Lockfile & Dependency Integrity

Validate:
- lockfile consistency
- integrity hashes
- reproducible installs
- deterministic builds

Fix requirements:
- enforce lockfile usage
- use frozen/immutable installs in CI
- reject unexpected lockfile changes

Recommended:
npm ci

or:
pnpm install --frozen-lockfile

# Phase 6 — Dependency Vulnerability Audit

Run:
- npm audit
- npm outdated
- npm ls

or:
- pnpm audit
- pnpm outdated
- pnpm list

Identify:
- critical vulnerabilities
- vulnerable transitive dependencies
- insecure peer dependencies
- deprecated libraries

After every change:
- lint
- typecheck
- build
- runtime validation

# Phase 7 — Runtime Hardening

Ensure protections exist:
- strict CSP
- secure headers
- restricted CORS
- sanitized HTML rendering
- secure cookie handling
- SSRF protections
- upload restrictions
- rate limiting
- RBAC enforcement

# Phase 8 — Developer Workstation Hardening

Audit local risks:
- dangerous VS Code extensions
- unsafe MCP integrations
- exposed .env files
- exposed npm tokens
- exposed GitHub tokens
- exposed cloud credentials

Recommended protections:
- least privilege credentials
- separate dev/prod credentials
- short-lived tokens
- hardware MFA
- secret scanning

# Phase 9 — AI Tooling & Agent Security

Audit:
- Codex
- Copilot
- Claude Code
- Cursor
- Continue.dev
- MCP integrations

Check for:
- unrestricted filesystem access
- unrestricted shell access
- credential exposure
- unsafe plugin execution
- unsafe MCP servers

# Phase 10 — Final Validation

After fixes:
- run lint
- run typecheck
- run build
- run tests
- perform runtime validation

Verify:
- no CMS regressions
- no editor regressions
- no page builder regressions
- no deployment regressions

# Required Final Report

Produce:
- executive summary
- findings by severity
- dependency risk matrix
- CI/CD security findings
- workstation risks
- files changed
- remaining risks
- recommended long-term hardening

# Final Instruction

Start with audit and risk classification.

Do NOT blindly modify dependencies before understanding:
- why the dependency exists
- whether it is actively used
- compatibility implications
- runtime impact

Apply fixes incrementally and validate after every important change.
