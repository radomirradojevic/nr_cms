# Composable Dynamic Appearance System: Phase 6

## Connect Content-Type Surfaces

Goal: allow blog, category, and page-builder surfaces to participate in the appearance system.

This phase includes:

- `BlogPostTemplate` variants.
- `BlogCategoryTemplate` variants.
- `PageTemplate` variants.
- Per-content overrides only after global templates are stable.

This phase does not include:

- Export/import.
- A new recipe version unless necessary.
- Additional Global Settings expansion beyond template controls.

Acceptance criteria:

- Blog post, blog category, and page-builder surfaces can follow global template selections.
- Page builder content continues to use semantic tokens and can re-theme without re-saving content.
- Existing URLs, edit affordances, auth states, and admin affordances remain intact.
- Per-content overrides are unavailable until global templates are stable and tested.

Content-template backlog for this phase:

- Blog post: metadata treatment.
- Blog post: cover image placement.
- Blog post: excerpt treatment.
- Blog post: comments placement.
- Blog post: edit affordance placement.
- Blog category: list.
- Blog category: cards.
- Blog category: magazine grid.
- Blog category: compact archive.
- Blog category: featured-first.
- Page: full-bleed builder.
- Page: contained builder.
- Page: framed builder.
- Page: landing mode.

Prompt:

```text
Work only on Phase 6.

Connect content-type surfaces to the AppearanceRecipe system.

Do the following:
1. Create BlogPostTemplate variants for metadata, cover placement, excerpt treatment, comments placement, and edit affordance placement.
2. Create BlogCategoryTemplate variants: list, cards, magazine grid, compact archive, and featured-first.
3. Create PageTemplate variants: full-bleed builder, contained builder, framed builder, and landing mode.
4. Connect the global template selection to public content surface rendering.
5. Add per-content overrides only if global templates are stable and tested.

Constraints:
- Page builder content must continue to use semantic tokens.
- Do not break existing URLs or auth/admin affordances.
- Do not introduce installable themes.
```
