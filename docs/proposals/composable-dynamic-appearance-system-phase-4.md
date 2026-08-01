# Composable Dynamic Appearance System: Phase 4

## Add Curated Shell Variants

Goal: introduce the first meaningful visual variation through internal typed variants.

This phase includes:

- Header variants: classic, centered, split, compact-app, editorial-masthead, and minimal.
- Footer variants: minimal, multi-column, centered, CTA, and hidden.
- Main variants: normal content, framed content, full-bleed builder pages, editorial articles, and category grids.
- Global Settings controls for variant selection and safe slot controls.

This phase does not include:

- Draft workflow.
- Thumbnails or preset cards.
- Per-content overrides.

Acceptance criteria:

- An admin can switch between materially different shell variants without installing code.
- Classic remains the default and migration-safe fallback.
- Header/footer composition is structured, previewable, responsive, and validated.
- Raw HTML remains available only as CustomHtml, not as the primary composition workflow.

Slot backlog for this phase:

- SocialLinks.
- Search.
- CTA.
- Legal links.
- Footer links.

Variant backlog for this phase:

- Header: sidebar/drawer.
- Header: transparent overlay.
- Header: no-header landing mode.
- Footer: sitemap.
- Footer: sticky utility bar.
- Main: documentation layout.

Prompt:

```text
Work only on Phase 4.

Add curated shell variants to the existing AppearanceRecipe system.

Do the following:
1. Implement header variants: classic, centered, split, compact-app, editorial-masthead, and minimal.
2. Implement footer variants: minimal, multi-column, centered, CTA, and hidden.
3. Implement main surface variants: normal content, framed content, full-bleed builder pages, editorial articles, and category grids.
4. Expose only variant selection and safe slot controls in Global Settings.
5. Preserve classic as the default and migration-safe fallback.

Constraints:
- Do not add installable themes.
- Do not make raw HTML the primary workflow; CustomHtml remains an expert escape hatch.
- Do not introduce per-content overrides.
```
