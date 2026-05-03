---
description: This file outlines the FRONTEND UI component usage guidelines for the project called "Night Raven CMS". This should be lightweight CMS with the basic elements that every CMS has. Read this to understand how to properly use and customize UI components.
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

## CMS FRONTEND IMPORTANT UI GUIDELINES:

- **CMS Frontend layout**: Should be simple and clean, with sticked header and footer and main content area between them. Top menu for navigation is located in header. The layout should be responsive and adaptable to different screen sizes, ensuring a seamless user experience across devices.

- **CMS Main Frontend content area**: The main content area represents the core of the CMS. It is space between the header and footer where users can manage their content and settings. Should be designed to accommodate various types of content, such as text, images, videos, and interactive elements, while maintaining a consistent and visually appealing layout. The main content area should be spacious and easy to read, with clear typography and ample whitespace. That area must render three different content types such a "page", "blog_post" or list of posts that belongs to specific blog category. That list of posts that belongs to specific blog category should looks like list of links of blog posts that belongs to the specific blog category. By default by going to the domain https://<your-cms-domain> "Main content area" should render content which is marked as "homepage=true" in the database, and it should be possible to change through backend API. The main content area should also support dynamic content loading to handle large amounts of content efficiently.

- **CMS Frontend Header and footer**: Should be built with shadcn/ui components and placed in `app/layout.tsx` for global use. Content of header and footer should be defined through backend API and rendered in header and footer components. Left side in header is reserved for logo, and right side is reserved for top menu. Footer should be simple with copyright information and links to privacy policy and terms of service.

- **CMS Frontend Top menu**: Top menu is located in Header on the right side. Links in the top menu should be rendered using shadcn/ui's `NavigationMenu` component, and the menu items should be defined through backend API and rendered in the navigation menu component. Menu items should support nested submenus for dropdowns.

- **Logo**: Logo is located in the left side of the header. It should be rendered using shadcn/ui's `Avatar` component, and the logo image should be defined through backend API and rendered in the avatar component. Logo should be clickable and redirect to the homepage.

- **CMS Frontend Custom UI**: If you need a custom UI element that shadcn/ui doesn't provide, compose existing components together. For example, create a card by combining `Card`, `CardHeader`, `CardContent`, and `CardFooter` primitives.
