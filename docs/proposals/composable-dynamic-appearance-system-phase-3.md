# Composable Dynamic Appearance System: Phase 3

## Extract Public Shell Regions

Goal: move the header and footer into components and render the current appearance through the classic recipe.

This phase includes:

- `SiteHeader`.
- `SiteFooter`.
- Slot renderers: Brand, SiteMenu, AdminMenu, AuthControls, RichText, CustomHtml, and Copyright.
- Classic recipe parity.

This phase does not include:

- New header or footer variants beyond classic.
- Preset cards.
- Content-type templates.

Acceptance criteria:

- Existing sites render identically after the classic recipe migration path.
- Header and footer rendering is driven by region config, but the classic output matches the previous layout.
- Existing custom header/footer HTML is represented as CustomHtml slots.
- Menus, auth controls, backend-user affordances, sticky behavior, and copyright behavior are preserved.

Slot backlog introduced in this phase:

- Brand.
- SiteMenu.
- AdminMenu.
- AuthControls.
- RichText.
- CustomHtml.
- Copyright.

Prompt:

```text
Work only on Phase 3.

The goal is a refactor without visual change: extract the public shell from app/layout.tsx into region-based components that use the resolved classic recipe.

Do the following:
1. Move header JSX from app/layout.tsx into a SiteHeader server component.
2. Move footer JSX into a SiteFooter server component.
3. Implement slot renderers for Brand, SiteMenu, AdminMenu, AuthControls, RichText, CustomHtml, and Copyright.
4. Render today's layout through the classic recipe.
5. Prove parity through tests or snapshot/smoke checks.

Constraints:
- Do not add new visual variants.
- Do not change the semantics of menus, auth controls, backend menu, or custom HTML.
- Do not introduce client components unless they are truly required.
```
