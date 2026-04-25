---
description: This file outlines the UI component usage guidelines for the project, which relies exclusively on shadcn/ui. Read this to understand how to properly use and customize UI components. 
---

# UI Components — shadcn/ui Only

> All UI in this project is built exclusively with [shadcn/ui](https://ui.shadcn.com). Do NOT create custom components.

## Rules

1. **Always use shadcn/ui** — Every button, input, dialog, card, table, dropdown, etc. must come from shadcn/ui (`components/ui/`).
2. **Never create custom UI components** — If a shadcn/ui component exists for the job, use it. Do not build bespoke alternatives.
3. **Add missing components via CLI** — If a needed shadcn/ui component isn't installed yet, add it:
   ```bash
   npx shadcn@latest add <component-name>
   ```
4. **Compose, don't reinvent** — Build complex UI by composing multiple shadcn/ui primitives together, not by creating new base components.
5. **Customise with Tailwind only** — Use the `className` prop and Tailwind utility classes (with `cn()` from `@/lib/utils`) to adjust styling. Never use CSS modules or inline styles.

## Project Config

- **Style**: `radix-nova`
- **Icons**: `lucide-react`
- **RSC-compatible**: `rsc: true` — components work in Server Components by default
- **Path aliases**: UI components live at `@/components/ui/`

## Do

- Import from `@/components/ui/<component>`
- Use `cn()` to merge conditional class names
- Use variant/size props already defined on components (e.g., `<Button variant="outline" size="sm">`)

## Don't

- Create files like `components/CustomButton.tsx` or `components/MyCard.tsx`
- Wrap shadcn/ui components in unnecessary abstraction layers
- Copy-paste component code outside of `components/ui/`
- Use raw HTML elements (`<button>`, `<input>`, `<dialog>`) when a shadcn/ui equivalent exists
