# Phase 03 - Private categories and attributes

## Prompt for this phase

Implement the private Webshop category and attribute dashboard. Product
categories must support unlimited nesting, category images, SEO fields, and
typed custom attributes that later generate product filters. Also add a public
CMS bridge/read-only Webshop categories tab to `/dashboard/content-categories`
that links into the Webshop dashboard for full management when the paid add-on
is installed and licensed.

## Goal

Build the admin interface and server logic for:

- Category tree management in `/dashboard/webshop/categories`.
- Unlimited category/subcategory nesting.
- Category metadata and image selection from the File Manager.
- Attribute definitions and category bindings.
- Read-only category display in `/dashboard/content-categories`.

## Private add-on boundary

Category and attribute management is paid Webshop functionality and should live
under `.private/webshop`. The public CMS may contain only:

- route shells that delegate to the private add-on;
- a read-only placeholder/bridge tab in `/dashboard/content-categories`;
- generic badges/links that do not expose private category logic;
- fallback UI for add-on missing, license missing, or license invalid;
- expired-license `edit_existing_only` UI where existing categories/attributes
  can be edited but create/add controls are disabled.

The free CMS must still build and run with no private category modules present.

## Existing files to inspect first

- `app/dashboard/content-categories/page.tsx`
- `app/dashboard/content-categories/category-table-container.tsx`
- `app/dashboard/content-categories/category-table.tsx`
- `app/dashboard/content-categories/actions.ts`
- `app/api/content-categories/route.ts`
- `app/dashboard/filemanager/*`
- `data/files.ts`
- `components/ui/tabs.tsx`
- `components/ui/table.tsx`
- `components/ui/dialog.tsx`
- `lib/roles.ts`
- `lib/admin-section-locks*`

## Category fields

Each category should support:

- Name
- Slug
- Parent category
- Description
- Category image from File Manager
- Meta title
- Meta description
- Status: draft, active, hidden, archived
- Position/sort order
- Optional external id for imports
- Created/updated actor fields

Recommended extras:

- `show_in_navigation`
- `show_in_filters`
- `canonical_category_id` for merged/deprecated categories
- `template_preset_id` override for category page layout

## Attribute model

Attributes should be reusable definitions, not one-off strings per category.

Examples:

- `vendor`: select, options Samsung/Huawei/Apple
- `screen_size`: number, unit inch
- `color`: color/select
- `file_format`: select, options PDF/ePub/ZIP
- `duration_minutes`: number for services/courses
- `delivery_mode`: select, online/in_person/download
- `license_type`: select, personal/commercial/team

Use attributes for faceted filtering only when the type can produce useful
filters. Free-text attributes should usually be searchable but not faceted.

## UI behavior

### Category tree

- Render a tree/table hybrid with indentation, expand/collapse, status badge,
  product count, updated date, and actions.
- Support create root category, create child category, edit, archive, move, and
  reorder.
- Use dialogs or side panels consistent with current dashboard UI.
- Prevent moving a category under itself or a descendant.
- Warn when archiving a category that has active products.

### Attribute management

- On each category detail page, show:
  - Own attributes
  - Inherited attributes from ancestors
  - Excluded inherited attributes
  - Attribute order
- Allow adding an existing attribute definition or creating a new one.
- For select/multi-select/color, manage options in a stable list.
- Show whether each attribute is required, filterable, searchable, and inherited.

### Read-only content categories tab

In `/dashboard/content-categories`:

- Add third tab: `Webshop categories`.
- The tab is admin-only because the page is already admin-only.
- Display webshop category tree read-only.
- Disable create/edit/delete controls in this tab.
- Each row should be clickable and link to
  `/dashboard/webshop/categories?category=<id>` or
  `/dashboard/webshop/categories/<id>`.
- Add visible text or badge that management happens in Webshop dashboard.

## Server Actions and routes

Create actions in the private add-on and expose them through the bridge. The
public CMS route shell may delegate to private implementations, but must not
contain the real category/attribute business logic.

Recommended private source location:

- `.private/webshop/src/admin/categories/actions.ts`
- `.private/webshop/src/data/webshop-categories.ts`
- `.private/webshop/src/data/webshop-attributes.ts`

Public route shells, if needed:

- `app/dashboard/webshop/categories/page.tsx`
- `app/dashboard/webshop/categories/[id]/page.tsx`

Recommended actions:

- `createWebshopCategory`
- `updateWebshopCategory`
- `moveWebshopCategory`
- `reorderWebshopCategory`
- `archiveWebshopCategory`
- `deleteWebshopCategory` only if unused
- `createWebshopAttribute`
- `updateWebshopAttribute`
- `deleteWebshopAttribute` only if unused
- `bindAttributeToCategory`
- `unbindAttributeFromCategory`
- `setCategoryAttributeOverrides`

Every action must:

- Check `auth()`.
- Load current user roles.
- Require admin in the first release.
- Verify that the Webshop add-on license is `ready` before create/add actions.
- Allow updates to existing categories/attributes in `edit_existing_only` mode
  when the license is expired.
- Validate with Zod.
- Return `{ error: string }` on user-facing failures.
- Use transactions for tree moves and attribute changes that affect multiple
  rows.

## Acceptance criteria

- Admin can create nested categories to at least five levels in UI.
- Tree closure rows stay correct after moves.
- Admin can define category attributes and options.
- Inherited attributes are visible on child categories.
- `/dashboard/content-categories` has a read-only Webshop categories tab.
- Clicking a read-only webshop category opens the management view in Webshop
  dashboard.
- Existing page/blog category tabs still work unchanged.
- The free CMS shows a non-crashing locked/read-only state when the add-on is
  not installed or not licensed.
- Expired license keeps existing category/attribute edit routes usable but
  disables create/add buttons and direct create actions.

## Tests to add or update

- Create root, child, grandchild category.
- Move category and verify closure depth.
- Prevent category cycle.
- Bind inherited attribute and verify child product form can resolve it later.
- Read-only tab does not render create/edit/delete controls.
- Non-admin direct action calls return forbidden.
- Missing/invalid license direct action calls return forbidden before any
  category mutation.
- Expired license direct create/add calls return forbidden, while existing
  category/attribute update calls are allowed.

## Edge cases

- Two categories with the same slug are allowed only under different parents.
- Renaming a category should not break product canonical URLs without redirects.
- Deleting an option like `Samsung` should be blocked if products use it.
- Required inherited attributes should not make existing products invalid until
  an explicit validation/migration pass is run.
- Numeric attributes need unit handling to avoid mixing grams/kg or cm/inch.
