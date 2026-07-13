# Composable Dynamic Appearance System: Phase 5

## Improve Presets and Preview Workflow

Goal: improve the admin experience, preview workflow, and draft preset application.

This phase includes:

- Desktop/tablet/mobile preview tabs.
- Preset cards with visual thumbnails.
- Applying a preset as a draft.
- Slot customization before save.
- Reset-to-preset while preserving site name, logo, menus, and content.

This phase does not include:

- New content-type templates.
- Import/export.
- Recipe migrations beyond v1.

Acceptance criteria:

- Presets are selectable through visual cards rather than text-only controls.
- Preview supports desktop, tablet, and mobile shell states before saving.
- Applying a preset as a draft does not overwrite site name, logo, menus, or existing content.
- Reset-to-preset restores preset structure while preserving site identity and content.

Preset backlog for this phase:

- Classic CMS: left brand, horizontal menu, content container, simple footer.
- Editorial: masthead header, centered logo, top category rail, article metadata emphasis, multi-column footer.
- Portfolio: transparent overlay header, full-bleed builder canvas, minimal footer, image-heavy block defaults.
- Documentation: compact top bar, optional side navigation, narrow reading measure, footer sitemap.
- SaaS/Product: app-style header, CTA slot, card-forward surfaces, footer columns.
- Magazine: category header, post cards, featured/secondary list layout, denser footer.
- Campaign: optional no-header landing mode, full-bleed page builder, strong CTA or hidden footer.

Prompt:

```text
Work only on Phase 5.

Improve the Global Settings appearance workflow for recipes and presets.

Do the following:
1. Replace the simple theme preview with a full shell preview using desktop/tablet/mobile tabs.
2. Add preset cards with visual thumbnails.
3. Allow admins to apply a preset as a draft before saving.
4. Allow admins to customize slots before saving.
5. Add reset-to-preset behavior that preserves site name, logo, menus, and existing content data.

Constraints:
- Do not change content-type surfaces.
- Do not add per-content overrides.
- Do not introduce import/export.
- The UI must follow existing shadcn/ui and Tailwind v4 patterns.
```
