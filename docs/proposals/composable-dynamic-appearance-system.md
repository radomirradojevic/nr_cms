# Composable Dynamic Appearance System

This document summarizes the chronological implementation path for evolving Night Raven CMS from mostly global visual themes into a composable dynamic appearance system. The detailed phase instructions live in the phase-specific files in this folder:

- [Phase 1](./composable-dynamic-appearance-system-phase-1.md)
- [Phase 2](./composable-dynamic-appearance-system-phase-2.md)
- [Phase 3](./composable-dynamic-appearance-system-phase-3.md)
- [Phase 4](./composable-dynamic-appearance-system-phase-4.md)
- [Phase 5](./composable-dynamic-appearance-system-phase-5.md)
- [Phase 6](./composable-dynamic-appearance-system-phase-6.md)
- [Phase 7](./composable-dynamic-appearance-system-phase-7.md)

## Purpose

The goal is to let administrators create materially different public site appearances without installing external WordPress/Joomla-style themes, loading arbitrary plugin code, or replacing the current CMS architecture. Appearance should become a typed internal recipe made from existing Night Raven CMS primitives:

- Global design tokens.
- Header, footer, and main shell variants.
- Structured regions and slots.
- Safe slot components.
- Curated presets.
- Content-type templates for blog posts, categories, and page-builder pages.

The system should preserve the current global appearance foundation instead of discarding it. Existing theme, width, font, radius, shadow, sticky, header, footer, and page-builder semantic style behavior should remain compatible throughout the migration.

## Stack Constraints

All phases must follow the current Night Raven CMS technical stack and project conventions.

This project uses Next.js 16.2.4, so implementation must follow the newer app architecture rules:

- Use `proxy.ts` for proxy/middleware behavior. Do not create `middleware.ts`.
- Treat `params` and `searchParams` as Promises in pages, layouts, and route handlers.
- Prefer Server Components by default.
- Add `'use client'` only for components that need client-side interactivity, hooks, or browser APIs.

Styling must remain inside the existing Tailwind CSS v4 and shadcn/ui setup:

- Tailwind configuration belongs in `globals.css` through `@theme` and CSS imports.
- Do not introduce `tailwind.config.js`.
- Use existing shadcn/ui components from `components/ui/`.
- Use `cn()` from `@/lib/utils`.
- Do not introduce CSS modules or inline style systems for the appearance architecture.

Data and authentication must follow existing project patterns:

- Use Drizzle ORM through `@/db`.
- Use the schema from `@/db/schema`.
- Store appearance recipe data in the existing `global_settings` model path.
- Use `auth()` from `@clerk/nextjs/server` in every Server Action and Route Handler that reads or writes protected settings.
- Server Actions should validate input and return error objects instead of throwing for expected validation failures.

Imports and project organization must remain consistent:

- Use the `@/*` path alias for project imports.
- Keep shared appearance logic in appropriate `lib/` modules.
- Keep app components in `components/`.
- Keep UI primitives in `components/ui/`.
- Use the ESLint v9 flat config already present in `eslint.config.mjs`.

## Chronological Strategy

The work is intentionally split into seven phases. The sequence matters. Early phases protect current behavior and build compatibility. Middle phases introduce visible flexibility. The final phase turns the system into a maintainable, portable, and testable architecture.

### Phase 1: Inventory and Preserve Current Behavior

Phase 1 is a no-runtime-change phase. It documents the current public shell contract, strengthens tests around existing appearance resolution, and introduces the first `AppearanceRecipe v1` TypeScript and Zod definitions without connecting them to rendering.

This phase protects the current baseline before any migration begins. The system must still render existing default, dark, cyberpunk, and aurora public shells exactly as before. The purpose is to create enough documentation and test coverage that later phases can prove parity instead of relying on visual memory.

### Phase 2: Introduce Recipe Storage Behind Compatibility

Phase 2 adds recipe storage and compatibility parsing while keeping legacy global settings authoritative. The `appearanceRecipe` JSONB field is introduced on `global_settings`, and `parseAppearanceRecipe()` resolves missing or empty recipes into a default classic recipe derived from the existing fields.

The public render output should not change in this phase. The CMS gains the ability to carry recipe-shaped data, but rollback remains simple because the existing global settings fields still drive behavior.

### Phase 3: Extract Public Shell Regions

Phase 3 moves the current header and footer out of `app/layout.tsx` into dedicated server components that receive resolved region configuration. This is the structural refactor that turns the existing shell into recipe-driven regions while preserving the classic output.

The first slot renderer set should cover the current behavior: Brand, SiteMenu, AdminMenu, AuthControls, RichText, CustomHtml, and Copyright. Existing custom header and footer HTML should become CustomHtml slots in the classic recipe. Menus, auth controls, backend-user affordances, sticky behavior, and copyright behavior must remain unchanged.

### Phase 4: Add Curated Shell Variants

Phase 4 is the first phase where the system should create visible appearance diversity. It adds curated header, footer, and main surface variants through typed internal registries rather than installable themes.

Initial variants should stay focused: classic, centered, split, compact-app, editorial-masthead, and minimal headers; minimal, multi-column, centered, CTA, and hidden footers; and normal, framed, full-bleed, editorial, and category-grid main surfaces. Additional backlog variants such as sidebar/drawer, transparent overlay, no-header landing mode, sitemap footer, sticky utility bar, and documentation layout can follow after the core variant model is stable.

The Global Settings surface should expose variant selection and safe slot controls first. Raw HTML should remain available as CustomHtml, but it should not become the primary workflow for composing appearances.

### Phase 5: Improve Presets and Preview Workflow

Phase 5 improves the admin workflow around presets and previews. The simple theme preview evolves into a full shell recipe preview with desktop, tablet, and mobile modes. Presets become visual cards rather than text-only select options.

Admins should be able to apply a preset as a draft, customize slots before saving, and reset back to a preset while preserving site identity and content. Preset work should remain data-driven inside the application and should not become an external theme installation system.

The preset backlog includes Classic CMS, Editorial, Portfolio, Documentation, SaaS/Product, Magazine, and Campaign. These presets combine token choices, shell structure, slots, and content defaults into curated starting points.

### Phase 6: Connect Content-Type Surfaces

Phase 6 extends the appearance system beyond the global shell and into public content surfaces. Blog posts, blog category pages, and page-builder pages should be able to follow global template selections.

This phase introduces `BlogPostTemplate`, `BlogCategoryTemplate`, and `PageTemplate` variants. The page builder must continue to use semantic tokens so content can re-theme without being re-saved. Existing URLs, edit affordances, auth states, and admin affordances must remain intact.

Per-content overrides should wait until the global templates are stable and tested. The first implementation should prefer global template consistency over broad per-item freedom.

### Phase 7: Governance, Migrations, and Quality Gates

Phase 7 makes the appearance system durable. Recipes become versioned, migration helpers are added, accessibility behavior is checked, reduced-motion preferences are respected, and export/import becomes available as data portability.

Export/import must remain data-only. It must not allow external code execution and must not become an installable theme marketplace. Migrations should include tested fallbacks, and QA should cover desktop, tablet, mobile, signed-out, signed-in, and backend-user scenarios.

The final quality bar is that existing sites still render identically after migration to the classic recipe, at least three materially different appearances can be selected without installing code, page-builder semantic tokens continue to re-theme without re-saving content, and header/footer composition remains structured, previewable, responsive, and validated.

## Implementation Rule

Do not pull later-phase work into earlier phases. Phases 1-3 are about parity and infrastructure. Phases 4-6 are about visible flexibility. Phase 7 is about stabilization, migration safety, accessibility, and portability.

This order keeps the CMS from growing a large appearance UI before the rendering model, compatibility layer, and classic parity path are stable.
