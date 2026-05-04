---
description: This file outlines the BACKEND UI component usage guidelines for the project called "Night Raven CMS". This should be lightweight CMS with the basic elements that every CMS has. Read this to understand how to properly use and customize UI components.
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

## CMS BACKEND IMPORTANT UI GUIDELINES:

IMPORTANT: CMS Backend UI should be designed with a focus on usability and efficiency for "admin", "publisher" and "author" user types. It should provide clear navigation, intuitive interfaces, and easy access to key features for content management, user administration, and site settings configuration. The backend UI should also prioritize performance and responsiveness to ensure a smooth experience for backend users managing the CMS.

- **CMS Backend layout**: Should be simple and clean defined in dashboard section that should define backend layout which can only be accessed by "admin", "publisher" and "author" user types, with sticked header and footer and main content area between them. "Backend Top menu" for navigation is located in header. The layout should be responsive and adaptable to different screen sizes, ensuring a seamless backend user experience across devices.

- **CMS Main Backend content area**: The main content area represents the core of the CMS backend. It is space between the header and footer where admin users can manage their content and site settings. Should be designed to accommodate various types of content, such as forms, tables, charts, and interactive elements, while maintaining a consistent and visually appealing layout. The main content area should be spacious and easy to read, with clear typography and ample whitespace. That area must render different content types based on the backend route, such as "dashboard", "content management", "media library", "user management", "settings" etc. Each content type should have its own layout and components that are suitable for the specific tasks performed in that section of the backend. For example, "dashboard" should display an overview of key metrics like a number of pages etc, while "dashboard/content" should render a table of content of page items with options to create, edit, delete and filter pages, while "dashboard/settings" should render forms for site settings management.

- **CMS Backend Header and footer**: Should be built with shadcn/ui components. Header should contains "CMS Backend Top menu". Left side in header is reserved for logo. Footer should be simple with copyright information and links to privacy policy and terms of service.

- **CMS Backend Top menu**: Backend Top menu is located in Header on the right side. Links in the top menu should be rendered using shadcn/ui's `NavigationMenu` component, and the menu items should have following structure:

1. Dashboard (link to /dashboard). It's the main backend landing page for "admin", "publisher" and "author" user types after they log in, providing an overview of key metrics and quick access to important sections of the backend based on their user role. Dashboard should display relevant information and shortcuts for managing content, users, and site settings, tailored to the permissions of each user type.

2. Content Management (link to /dashboard/content). This section allows "admin", "publisher" and "author" user types based on their permissions ACL (RBAC) to manage content types. There are 2 content types: "page" and "blog_post". Both content types are stored in same table in database table called "content". They are differentiated by "content_type" column in the database. In database table "content" there is boolean column called "homepage" which defines if the specific item is homepage or not. Both content types "page" and "blog_post" can have value true or false in field called "homepage" and only one item that is type "page" or "blog_post" can have defined true as value in homepage filed, while other items must have false value. Item that have value true in column "homepage" is rendered in the main content area in frontend when user goes to the domain https://<your-cms-domain>. In table "content" there is also filed called category_id which defines category of the specific content item, and it should be possible to filter content items by category in the backend UI. Categories for content items are stored in separate table in the database called "content_categories". User can create unlimited number of categories but there are two types of categories "page" and "blog_post" that define to which content type that category belongs to. Each content item can have only one category, and it is defined by "category_id" column in the "content" database table. Each category has its own page where admin can see list of content items that belongs to specific category. Content management section should provide options to create, edit, delete, and organize content items.

3. Media Library (link to /dashboard/media). This section allows "admin", "publisher" and "author" user types to manage media assets like images and videos. It should provide options to upload, organize, and delete media files based on user type permissions. Media library should support categorization and tagging of media assets for easy retrieval and management. It should also provide a user-friendly interface for browsing and searching media files, with features like pagination and filtering to handle large media collections efficiently. Admin users should have full access to all media management features, while publisher and author users should have limited access based on their permissions, such as only being able to manage media assets associated with their own content.

4. User Management (link to /dashboard/users). This section allows "admin" user type ONLY to manage user accounts created in clerk. Using clerk admin should be able to manage users, assign roles, and handle permissions. There should be 4 user roles: "admin", "publisher", "author", "viewer". Admin users have full access to all backend features, Publisher users can create and manage its own and content created by authors but cannot manage anything else in backend, Author users can only create and manage its own content but can't publish it (it is reserved for publishers and admins), while Viewer users can only view content in frontend without ability to access backend. Viewer users should not have access to backend at all, and if they try to access it, they should be redirected to the homepage in frontend. When user is register in the system, by default it should be assigned "viewer" role, and admin users should have ability to change user roles through backend UI (if it is posible using clerk API). Menu items should support nested submenus for dropdowns.

5. Settings (link to /dashboard/settings). This section allows "admin" user type ONLY to manage site settings. Site settings should be stored in the database in the table called "settings" with columns "key" and "value". Admin users should have a form-based interface to update site settings, and changes should be immediately reflected in the frontend and backend UI where applicable. For example, if there is a setting for "site_title", when admin user updates it in the backend, it should be immediately reflected in the header of the frontend UI.

6. Frontend top menu management (link to /dashboard/top-menu). This section allows "admin" user type ONLY to manage top menu items in the frontend. Top menu items should be stored in the database in the table called "top_menu_items" with columns "id", "label", "url", "parent_id" (for nested submenus), and "order" (for sorting). Admin users should have a form-based interface to create, edit, delete, and organize top menu items, including support for nested submenus. Changes to the top menu should be immediately reflected in the frontend UI. For example, if admin user adds a new menu item called "Blog" with URL "/blog", it should immediately appear in the top menu of the frontend UI. Creating links in the top menu should be done by admin user only, and through backend UI, and it should not be hardcoded in the frontend codebase. This allows for dynamic management of the top menu without requiring code changes or redeployments.

7. Content categories management (link to /dashboard/content-categories). This section allows "admin" user type ONLY to manage content categories for both "page" and "blog_post" content types. Content categories should be stored in the database in the table called "content_categories" with columns "id", "name", and "content_type" (to differentiate between page categories and blog post categories). Admin users should have a form-based interface to create, edit, delete, and organize content categories. Changes to content categories should be immediately reflected in the backend UI where applicable, such as when filtering content items by category in the content management section. By default, there should be some predefined categories for both "page" and "blog_post" content types. For page content type predefined category will be "site", for "blog_post" predefined category will be "blog", but admin users should have the flexibility to manage categories based on their specific needs. Each category has its own page where admin can see list of content items that belongs to specific category. Category can't be deleted if there are content items that belongs to that category, and admin user should be notified about that when they try to delete category that is assigned to some content items.

- **Logo**: Logo is located in the left side of the header. It should be rendered using shadcn/ui's `Avatar` component, and the logo image should be defined through backend API and rendered in the avatar component. Logo should be clickable and redirect to the homepage. Logo can be defined by admin users in the backend UI, and it should be stored in the database as a URL string. When admin user updates logo URL in the backend, it should be immediately reflected in the header of the backend UI.
