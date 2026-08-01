# Composable Dynamic Appearance System: Phase 2

## Introduce Recipe Storage Behind Compatibility

Goal: add recipe storage and a resolver while keeping legacy fields authoritative.

This phase includes:

- `appearanceRecipe` JSONB field in `global_settings`.
- `parseAppearanceRecipe()`.
- Merging legacy fields into the default classic recipe.
- Extending `getGlobalSettings()` to expose both legacy appearance and the resolved recipe.

This phase does not include:

- Rendering header/footer through the recipe.
- Full recipe UI in Global Settings.
- New variants.

Acceptance criteria:

- `global_settings` can store an empty or populated `appearanceRecipe` JSONB value.
- Empty or missing recipes resolve to a default classic recipe based on legacy fields.
- Legacy fields remain authoritative, so rollback is simple.
- `getGlobalSettings()` exposes both legacy appearance data and the resolved recipe without changing the public render output.

Prompt:

```text
Work only on Phase 2.

Add storage and a compatibility layer for AppearanceRecipe without changing rendering.

Do the following:
1. Add an appearanceRecipe JSONB field to global_settings with default '{}'.
2. Implement parseAppearanceRecipe() that validates the recipe through the Zod schema.
3. When the recipe does not exist or is empty, generate the default classic recipe from legacy global_settings fields.
4. Keep legacy fields authoritative during this phase.
5. Extend getGlobalSettings() so it returns both legacy appearance data and resolvedAppearanceRecipe.

Constraints:
- Do not change app/layout.tsx output.
- Do not introduce shell variants.
- Do not change the Global Settings UI unless minimally required for types/fallback.
- Server Actions and Route Handlers must check auth().
```
