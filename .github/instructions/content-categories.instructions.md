---
description: Outlines the rules and conventions for implementing the /dashboard/content-categories section. Read this whenever working on content category management, the content_categories database table, or any CRUD related to categories.
applyTo: "app/dashboard/content-categories/**"
---

# Content Categories Management — `/dashboard/content-categories`

> Admin-only section for managing content categories for both `page` and `blog_post` content types.

## Access Control

- Route is restricted to users whose `roles` array includes `"admin"` only.
- Guard `/dashboard/content-categories(.*)` in `proxy.ts` — redirect non-admins to `/dashboard`.
- Every Server Action in this section MUST verify `"admin"` role after calling `auth()`.

```ts
const { sessionClaims } = await auth();
const roles = (sessionClaims?.publicMetadata?.roles as string[]) ?? [];
if (!roles.includes("admin")) return { error: "Forbidden." };
```

## Database Schema

Table: `content_categories`

| Column         | Type                       | Notes                              |
| -------------- | -------------------------- | ---------------------------------- |
| `id`           | `uuid` (primary key)       | Generated with `gen_random_uuid()` |
| `name`         | `text`, not null           | Category display name              |
| `content_type` | `text`, not null           | Either `"page"` or `"blog_post"`   |
| `created`      | `timestamp with time zone` | Defaults to `now()`                |
| `updated`      | `timestamp with time zone` | Auto-updated on every row change   |

Define the table in `db/schema.ts` using Drizzle ORM:

```ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const contentCategories = pgTable("content_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  contentType: text("content_type").notNull(), // "page" | "blog_post"
  created: timestamp("created", { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp("updated", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
```

Generate and run a Drizzle migration after adding the schema.

## Seed / Predefined Categories

Two predefined categories must be seeded into the database:

| name   | content_type |
| ------ | ------------ |
| `site` | `page`       |
| `blog` | `blog_post`  |

Add these in `db/seed.ts`. Use `ON CONFLICT DO NOTHING` / `insertIgnore` to prevent duplicates on re-seed.

## File Structure

```
app/
  dashboard/
    content-categories/
      page.tsx                  ← Server Component — lists all categories grouped by content_type
      create-category-dialog.tsx ← Client Component — form dialog for creating a category
      edit-category-dialog.tsx   ← Client Component — form dialog for editing a category name
      delete-category-dialog.tsx ← Client Component — confirmation dialog for deletion
      actions.ts                 ← Server Actions — create, update, delete
data/
  content-categories.ts          ← Data helpers — all Drizzle queries for content_categories
```

## Data Helpers (`data/content-categories.ts`)

```ts
// getAllCategories(): returns all rows ordered by content_type, then name
// getCategoriesByType(type: "page" | "blog_post"): filtered list
// getCategoryById(id: string): single row
// isCategoryInUse(id: string): boolean — checks if any content item references this category_id
```

The `isCategoryInUse` helper must query the `content` table for any row where `category_id = id`. If a join between `content` and `content_categories` tables is needed, do it here.

## Server Actions (`actions.ts`)

### `createCategory`

```ts
type CreateCategoryInput = { name: string; contentType: "page" | "blog_post" };
```

- Validate with Zod: `name` — `string().min(1).max(100)`, `contentType` — `z.enum(["page", "blog_post"])`.
- Insert into `content_categories` via data helper.

### `updateCategory`

```ts
type UpdateCategoryInput = { id: string; name: string };
```

- Validate with Zod: `id` — `string().uuid()`, `name` — `string().min(1).max(100)`.
- Only `name` is updatable — `content_type` is immutable after creation.

### `deleteCategory`

```ts
type DeleteCategoryInput = { id: string };
```

- Call `isCategoryInUse(id)` before deleting.
- If in use, return `{ error: "This category is assigned to content items and cannot be deleted." }`.
- Otherwise, delete the row and return `{ success: true }`.

## UI — Page Layout (`page.tsx`)

- Server Component — call `auth()` and verify admin role; redirect if not.
- Fetch all categories via `getAllCategories()` from `/data/content-categories`.
- Render two sections side by side (or stacked on mobile): **Page Categories** and **Blog Post Categories**.
- Each section has a table (shadcn/ui `Table`) listing category names with Edit and Delete action buttons per row.
- A **"Add Category"** button opens `<CreateCategoryDialog>` for the respective content type.

## UI — Dialogs

Use shadcn/ui `Dialog` for create/edit and `AlertDialog` for delete confirmation.

### Create/Edit Dialog

- A single `Input` field for `name`.
- `content_type` is either passed as a prop (create) or read-only (edit).
- On submit, call the corresponding Server Action and close dialog on success.
- Show inline validation errors returned from the action.

### Delete Dialog (`AlertDialog`)

- Triggered from the delete button in the table row.
- If the Server Action returns an error (category in use), display the error message **inside the dialog** — do not close it.
- On success, remove the row from the UI immediately (optimistic update or re-fetch).

## Rules

- `content_type` is set at creation and **cannot be changed** afterwards.
- Category `name` must be unique **per `content_type`** — enforce at DB level with a unique constraint on `(name, content_type)` and handle the conflict gracefully in the action.
- Predefined categories (`site`, `blog`) can be edited or deleted like any other category, subject to the same in-use constraint.
- All mutations go through Server Actions in `actions.ts` — no direct DB calls from Client Components.
- All data reads go through helpers in `data/content-categories.ts` — no raw Drizzle in page/component files.

## Implementation Checklist

- [ ] Add `contentCategories` table to `db/schema.ts` with uuid primary key and unique constraint on `(name, content_type)`
- [ ] Generate and apply Drizzle migration
- [ ] Add seed data for `site` (page) and `blog` (blog_post) in `db/seed.ts`
- [ ] Create `data/content-categories.ts` with all query helpers including `isCategoryInUse`
- [ ] Create `app/dashboard/content-categories/actions.ts` with `createCategory`, `updateCategory`, `deleteCategory`
- [ ] Create `app/dashboard/content-categories/page.tsx` (Server Component, admin-gated)
- [ ] Create `create-category-dialog.tsx`, `edit-category-dialog.tsx`, `delete-category-dialog.tsx` (Client Components)
- [ ] Guard `/dashboard/content-categories(.*)` in `proxy.ts`
- [ ] Add **Content Categories** nav link to the backend top menu (NavigationMenu) pointing to `/dashboard/content-categories`
