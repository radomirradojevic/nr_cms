# Agent Instructions — Link Shortener Project

> These instructions define the coding standards and conventions for LLM agents working on this project. Read them before writing any code.

## Critical Warning

<!-- BEGIN:nextjs-agent-rules -->
**This is NOT the Next.js you know.** This project runs Next.js **16.2.4** with breaking changes from prior versions. APIs, conventions, and file structure differ from your training data. When in doubt, consult `node_modules/next/dist/docs/`.
<!-- END:nextjs-agent-rules -->

### Key Breaking Changes

- **Middleware → Proxy**: The file is `proxy.ts`, not `middleware.ts`. **NEVER create or use `middleware.ts`** — it is deprecated in this version of Next.js and will not work. All middleware logic (routing, redirecting etc...) MUST go in `proxy.ts`.
- **`params`/`searchParams` are Promises**: Must `await` them in pages, layouts, and route handlers
- **Tailwind CSS v4**: No `tailwind.config.js` — config lives in `globals.css` via `@theme` and CSS imports
- **ESLint v9 flat config**: Uses `eslint.config.mjs`, not `.eslintrc`

## Instruction Files

> **⚠️ MANDATORY: You MUST read the relevant instruction file(s) from the `docs/` directory BEFORE generating ANY code. No exceptions. Skipping this step will result in incorrect, non-compliant code. Do NOT rely on assumptions or prior knowledge — always open and read the specific `docs/*.md` file for the feature area you are working on.**

- [`docs/auth.md`](docs/auth.md) — Authentication (Clerk): route protection, modals, redirects
- [`docs/ui.md`](docs/ui.md) — UI components: shadcn/ui only, no custom components



## Quick Reference

- **Path alias**: `@/*` maps to project root — use it for all imports
- **Components**: shadcn/ui in `components/ui/`, app components in `components/`
- **Database**: Drizzle ORM client at `@/db`, schema at `@/db/schema`
- **Auth**: `auth()` from `@clerk/nextjs/server` — check it in every Server Action and Route Handler
- **Styling**: Tailwind utility classes + `cn()` from `@/lib/utils` — no CSS modules or inline styles
- **Server Actions**: `'use server'` directive, return error objects (don't throw), validate all inputs
- **Default to Server Components** — only add `'use client'` when interactivity or hooks are needed
