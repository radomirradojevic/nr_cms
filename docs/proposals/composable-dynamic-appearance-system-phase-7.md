# Composable Dynamic Appearance System: Phase 7

## Governance, Migrations, and Quality Gates

Goal: make the system maintainable over the long term.

This phase includes:

- Versioned `AppearanceRecipe`.
- Migration helpers.
- Accessibility checks.
- Reduced-motion handling.
- Export/import as data portability.

This phase does not include:

- A plugin or theme marketplace.
- Installable themes.
- Breaking schema changes without migrations.

Acceptance criteria:

- Appearance recipes are versioned and can be migrated forward with tested fallbacks.
- Accessibility checks cover landmarks, nav labels, focus order, contrast, and sticky behavior.
- Reduced-motion preferences are respected for recipe-level animation and background effects.
- Export/import is implemented as data portability and cannot execute external code.
- QA covers desktop, tablet, mobile, signed-out, signed-in, and backend-user scenarios.

Quality gate backlog for this phase:

- At least three materially different appearances can be selected without installing code.
- Existing sites render identically after migration to the classic recipe.
- Page builder semantic tokens continue to re-theme without content re-save.
- Header/footer composition remains structured, previewable, responsive, and validated.

Prompt:

```text
Work only on Phase 7.

Add governance, migrations, and quality gates for the AppearanceRecipe system.

Do the following:
1. Version AppearanceRecipe and add migration helpers similar to BuilderData versioning.
2. Add accessibility checks for landmarks, nav labels, focus order, contrast, and sticky behavior.
3. Add reduced-motion handling for recipe-level animation/background effects.
4. Add appearance recipe export/import as data portability.
5. Cover desktop/tablet/mobile, signed-out, signed-in, and backend-user scenarios.

Constraints:
- Export/import is not an installable theme system.
- Do not allow external code execution.
- All migrations must have fallbacks and tests.
```
