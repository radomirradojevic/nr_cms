---
description: Outlines the rules and conventions for implementing the /dashboard/content section. Read this whenever working on content management (pages and blog posts), the content database table, the page builder, the WYSIWYG editor, or any CRUD related to content items.
applyTo: "app/dashboard/content/**"
---

# Content Management — `/dashboard/content`

> Backend (CMS) section for managing two content types stored in a single `content` table: `page` (built with a visual page builder) and `blog_post` (authored in a WYSIWYG editor).

## Access Control

- Route is restricted to users whose `roles` array includes `"admin"`, `"publisher"`, or `"author"`.
- `"viewer"` role is **forbidden** from the entire `/dashboard` area and therefore from `/dashboard/content`.
- Guard `/dashboard/content(.*)` in `proxy.ts` — redirect users without an allowed role to `/dashboard`.
- Every Server Action in this section MUST call `auth()` and re-verify the role + ownership rules below.

```ts
const { userId, sessionClaims } = await auth();
if (!userId) return { error: "Unauthorized." };
const roles = (sessionClaims?.publicMetadata?.roles as string[]) ?? [];
const allowed = ["admin", "publisher", "author"];
if (!roles.some((r) => allowed.includes(r))) return { error: "Forbidden." };
```

### Per-action permission matrix

| Capability                           | admin | publisher                        | author                  |
| ------------------------------------ | ----- | -------------------------------- | ----------------------- |
| Create content                       | ✅    | ✅                               | ✅ (always unpublished) |
| Edit / delete own content            | ✅    | ✅                               | ✅                      |
| Edit / delete content of `author`    | ✅    | ✅                               | ❌                      |
| Edit / delete content of `publisher` | ✅    | ❌                               | ❌                      |
| Edit / delete content of `admin`     | ✅    | ❌                               | ❌                      |
| Publish / unpublish / archive        | ✅    | ✅ (own + author's, not admin's) | ❌                      |
| Set `homepage = true`                | ✅    | ❌                               | ❌                      |

Resolve the author's role by reading `publicMetadata.roles` of the `author_id` (Clerk user) via the Clerk SDK. Cache per-request if needed.

## Database Schema

Table: `content`

| Column             | Type                       | Notes                                                                 |
| ------------------ | -------------------------- | --------------------------------------------------------------------- |
| `id`               | `uuid` PK                  | `defaultRandom()`                                                     |
| `content_type`     | `text` not null            | `"page"` or `"blog_post"`                                             |
| `category_id`      | `uuid` not null            | FK → `content_categories.id`, `onDelete: "restrict"`                  |
| `title`            | `text` not null            |                                                                       |
| `content`          | `text`                     | Rendered HTML (source of truth for SSR output)                        |
| `content_json`     | `jsonb`                    | Editor state (Puck data for `page`, Tiptap JSON for `blog_post`)      |
| `meta_title`       | `text`                     | SEO                                                                   |
| `meta_description` | `text`                     | SEO                                                                   |
| `status`           | `text` not null            | `"published" \| "unpublished" \| "archived"`, default `"unpublished"` |
| `published_at`     | `timestamptz`              | Set when transitioning to `"published"`, cleared otherwise            |
| `excerpt`          | `text`                     | Mainly for `blog_post`                                                |
| `cover_image`      | `text`                     | URL; mainly for `blog_post`                                           |
| `slug`             | `text` not null **UNIQUE** |                                                                       |
| `author_id`        | `text` not null            | Clerk user ID                                                         |
| `homepage`         | `boolean` not null         | default `false`                                                       |
| `created_at`       | `timestamptz` not null     | default `now()`                                                       |
| `updated_at`       | `timestamptz` not null     | default `now()`, `$onUpdate(() => new Date())`                        |

Drizzle definition lives in `db/schema.ts`. Add:

- A **CHECK constraint** on `content_type IN ('page','blog_post')`.
- A **CHECK constraint** on `status IN ('published','unpublished','archived')`.
- A **partial unique index** to enforce only one homepage:
  `CREATE UNIQUE INDEX content_only_one_homepage ON content ((homepage)) WHERE homepage = true;`
- An index on `slug`, `status`, `content_type`, `category_id`, `author_id`.

Generate and run a Drizzle migration after schema changes.

## Editor Choices

### Page builder (`content_type = "page"`) — **Puck**

- Library: [`@measured/puck`](https://puckeditor.com) — MIT-licensed, React-first, App Router compatible.
- Store the editor state in `content_json` (Puck `Data`).
- On save, render the Puck data to HTML on the server using Puck's `<Render />` + `renderToStaticMarkup` and persist to `content`.
- Define the Puck config (components: `Heading`, `Text`, `Image`, `Hero`, `Columns`, `Button`, etc.) in `app/dashboard/content/_puck/config.ts`. Reuse shadcn/ui primitives where possible.

### WYSIWYG (`content_type = "blog_post"`) — **Tiptap**

- Library: [`@tiptap/react`](https://tiptap.dev) + `@tiptap/starter-kit` + extensions (`link`, `image`, `placeholder`, `typography`).
- Store the editor JSON in `content_json` (Tiptap `JSONContent`).
- On save, generate HTML with `generateHTML(json, extensions)` from `@tiptap/html` and persist to `content`.
- Editor wrapper component: `app/dashboard/content/_editors/blog-editor.tsx` (Client Component).

> Both editors must always write **both** `content_json` and `content`. `content_json` is the editable source; `content` is the rendered HTML used by the public site.

## File Structure

```
app/
  dashboard/
    content/
      page.tsx                       ← list view (table + filters + search + pagination + batch actions)
      content-table.tsx              ← Client Component — TanStack Table with selection, filters, pagination
      content-row-actions.tsx        ← Client Component — per-row dropdown (edit, publish/unpublish, delete, set-homepage)
      batch-actions.tsx              ← Client Component — batch delete / publish / unpublish bar
      actions.ts                     ← Server Actions — CRUD + status + homepage
      new/
        page.tsx                     ← Step 1: choose content_type → routes to /new/page or /new/blog_post
        page/page.tsx                ← Page builder form (Puck)
        blog_post/page.tsx           ← Blog post form (Tiptap)
      [id]/
        edit/page.tsx                ← Edit form, branches on stored content_type
      _editors/
        blog-editor.tsx              ← Tiptap wrapper (Client)
        page-editor.tsx              ← Puck wrapper (Client)
      _puck/
        config.ts                    ← Puck component config + render helpers
        render.ts                    ← Server-side Puck → HTML helper
data/
  content.ts                         ← all Drizzle queries for `content`
```

## Data Helpers (`data/content.ts`)

```ts
// listContent({ page, pageSize, search, contentType, status, categoryId, authorId, sort })
//   → paginated rows + total count, joined with content_categories for category name
// getContentById(id: string)
// getContentBySlug(slug: string)                ← used by public site
// getHomepageContent()                          ← row where homepage = true
// countContentByCategory(categoryId: string)    ← used by content-categories isCategoryInUse
// existsSlug(slug: string, excludeId?: string)  ← uniqueness check
```

No raw Drizzle in pages or components — go through this module.

## Server Actions (`actions.ts`)

All inputs validated with Zod. All actions return `{ success: true, ... } | { error: string, fieldErrors?: ... }`. After mutations, call `revalidatePath("/dashboard/content")` (and `revalidatePath("/")` when homepage or a published page changes).

### Shared helpers (private to the file)

```ts
async function loadActor(); // → { userId, roles }
async function loadTarget(id); // → content row + author roles
function canEdit(actor, target): boolean;
function canPublish(actor, target): boolean;
function canSetHomepage(actor): boolean; // admin only
```

### `createContent`

```ts
type CreateContentInput = {
  contentType: "page" | "blog_post";
  categoryId: string; // must belong to selected contentType
  title: string;
  slug: string;
  metaTitle?: string;
  metaDescription?: string;
  excerpt?: string;
  coverImage?: string;
  contentJson: unknown; // Puck Data or Tiptap JSON
};
```

- `author_id = userId`.
- `status` is forced to `"unpublished"` for `author` role; other roles may pass an initial status.
- Verify `categoryId` exists and its `content_type` matches `contentType`.
- Validate `slug` uniqueness via `existsSlug`.
- Render `content` (HTML) from `contentJson` using the appropriate renderer.
- Insert and return the new id.

### `updateContent`

```ts
type UpdateContentInput = {
  id: string;
  // any subset of editable fields above (NOT contentType, NOT authorId)
};
```

- Load target, run `canEdit(actor, target)` — return `{ error: "Forbidden." }` otherwise.
- `content_type` is **immutable**.
- If `categoryId` changes, re-validate it matches the row's `content_type`.
- Re-render `content` HTML if `contentJson` is provided.
- If `slug` changes, re-check uniqueness excluding `id`.

### `deleteContent`

- `canEdit` rules apply.
- If the row has `homepage = true`, return `{ error: "Cannot delete the homepage. Assign another page as homepage first." }`.

### `setStatus`

```ts
type SetStatusInput = {
  id: string;
  status: "published" | "unpublished" | "archived";
};
```

- `canPublish` must be true.
- When transitioning to `"published"` and `published_at` is null, set `published_at = now()`.
- When moving away from `"published"`, leave `published_at` as historical record (do not clear).

### `setHomepage`

```ts
type SetHomepageInput = { id: string };
```

- Admin only (`canSetHomepage`).
- Target row must have `content_type = "page"` and `status = "published"`.
- Run inside a transaction:
  1. `UPDATE content SET homepage = false WHERE homepage = true;`
  2. `UPDATE content SET homepage = true WHERE id = $1;`
- The partial unique index above guarantees correctness even under concurrency.

### `batchDelete` / `batchSetStatus`

- Accept `ids: string[]`. Process per-item with the same permission checks; return `{ success: true, results: [{id, ok, error?}] }` so the UI can show partial failures.

## UI — List Page (`page.tsx`)

- Server Component. Verify role; redirect if not allowed.
- Query params drive state: `?page=&pageSize=&q=&type=&status=&category=&author=&sort=`. Read with `await searchParams` (Next.js 16).
- Fetch via `listContent(...)`.
- Pass rows to `<ContentTable />` (Client) using TanStack Table:
  - Columns: select checkbox, title (link to edit), type badge, category, status badge, homepage indicator, author, updated_at, row actions.
  - Global search input bound to `q` (debounced, updates URL).
  - Filters: `content_type`, `status`, `category` (dependent on selected type when set), `author`.
  - Pagination controls (prev/next + page-size selector).
  - Selection enables `<BatchActions />`: Delete, Publish, Unpublish (subject to permissions — disable buttons the actor can't perform).
- "Create content" button → `/dashboard/content/new`.

## UI — Create Flow

1. `/dashboard/content/new` — small page with two big choice cards: **Page** and **Blog Post**. Selecting one routes to the matching form.
2. `/dashboard/content/new/page` — Puck-based form.
3. `/dashboard/content/new/blog_post` — Tiptap-based form.

### Common form fields (both types)

- `title`, `slug` (auto-generate from title, editable, validate uniqueness on blur via Server Action).
- `category_id` — **`<Select>` populated from `getCategoriesByType(contentType)`** (filtered to the chosen type).
- `meta_title`, `meta_description`.
- `status` — visible only to `admin` and `publisher`. Hidden / forced to `"unpublished"` for `author`.
- `homepage` toggle — visible only to `admin` and only when `content_type === "page"` and `status === "published"`.

### Page-only fields

- Puck editor area (full width).

### Blog-post-only fields

- `excerpt` (`Textarea`).
- `cover_image` (URL input or upload — match existing media handling in the project).
- Tiptap editor area.

## UI — Edit Page (`[id]/edit/page.tsx`)

- Server Component. Load row via `getContentById`, verify `canEdit`. 404 if not found, redirect to `/dashboard/content` if forbidden.
- Branch on `row.content_type` and render the same form component used in the matching create route, pre-filled with row data (including `content_json` for the editor).
- `content_type` is rendered as read-only.

## Rules

- `content_type` is set at creation and **cannot be changed** afterwards.
- `category_id.content_type` must always match `content.content_type` — enforce in actions.
- `slug` is globally unique. Use a slugify helper; never trust the client-provided value without re-validation.
- Always write **both** `content_json` and `content`. Never let them drift.
- Only one row may have `homepage = true` at any time — guaranteed by partial unique index AND by transactional swap in `setHomepage`.
- Authors cannot publish — enforce in `setStatus` and hide the control in the UI.
- All mutations go through Server Actions in `actions.ts`. All reads go through `data/content.ts`.
- Public site (frontend) reads `content` (HTML) for rendering and uses `getContentBySlug` / `getHomepageContent`. The dashboard uses `content_json` for editing.

## Implementation Checklist

- [ ] Add `content` table to `db/schema.ts` with all columns, FK to `content_categories`, CHECK constraints, and partial unique index on `homepage`
- [ ] Generate and apply Drizzle migration
- [ ] Install `@measured/puck`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/html`, and chosen extensions
- [ ] Create `data/content.ts` with all listed helpers
- [ ] Create `app/dashboard/content/actions.ts` with permission helpers + all Server Actions
- [ ] Build list page (`page.tsx`) with TanStack Table, search, filters, pagination, batch actions
- [ ] Build create choice page (`new/page.tsx`) and the two type-specific create forms
- [ ] Build edit page (`[id]/edit/page.tsx`) that branches on `content_type`
- [ ] Implement Puck config + server-side HTML renderer in `_puck/`
- [ ] Implement Tiptap wrapper in `_editors/blog-editor.tsx` + server-side `generateHTML` on save
- [ ] Guard `/dashboard/content(.*)` in `proxy.ts` for `admin | publisher | author`
- [ ] Add **Content** nav link to the backend NavigationMenu pointing to `/dashboard/content`
- [ ] Wire `data/content-categories.ts` `isCategoryInUse` to `countContentByCategory`
- [ ] Public site: update home route to render `getHomepageContent()` and add `[slug]` route using `getContentBySlug`
