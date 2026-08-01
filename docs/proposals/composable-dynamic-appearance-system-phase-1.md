# Composable Dynamic Appearance System: Phase 1

## Inventory and Preserve Current Behavior

Goal: do not change the visual output. Document the current system, add tests, and define the first version of the recipe types and schemas.

This phase includes:

- Current header/footer contract.
- Legacy appearance fields from `global_settings`.
- Tests for `resolveAppearance()`, content width fallback/normalization, and fallback parsing.
- Smoke or visual checks for the existing public shell themes.
- `AppearanceRecipe v1` TypeScript types and Zod schemas, without rendering changes.

This phase does not include:

- Database migration.
- Changes to `app/layout.tsx`.
- New header or footer variants.
- Global Settings UI changes.

Acceptance criteria:

- The current shell contract is documented clearly enough that later phases can prove parity.
- Existing public shells for default, dark, cyberpunk, and aurora remain visually unchanged.
- `resolveAppearance()`, content width normalization, and global settings fallback parsing have focused test coverage.
- `AppearanceRecipe v1` types and schemas exist, but no runtime rendering path depends on them yet.

Prompt:

```text
Work only on Phase 1 of the Composable Dynamic Appearance System proposal.

The goal is to preserve and document the current behavior without runtime changes. Read the existing appearance-related files: lib/appearance.ts, the global_settings database schema, app/layout.tsx, public blog/page surfaces, and the Global Settings form.

Do the following:
1. Document the current shell contract: header logo/site name/custom HTML/menu/backend menu/auth controls, footer custom HTML/copyright, sticky height, colors/glow/settings.
2. Add or strengthen tests for resolveAppearance(), content width normalization, and global settings fallback parsing.
3. Add basic smoke checks for the existing public shell themes: default, dark, cyberpunk, and aurora.
4. Define AppearanceRecipe v1 TypeScript types and a Zod schema in the appropriate lib file, but do not connect rendering to the recipe.

Constraints:
- Do not change the visual output.
- Do not add a database migration.
- Do not change app/layout.tsx rendering.
- Follow the Next.js 16.2.4 rules from AGENTS.md.
```
