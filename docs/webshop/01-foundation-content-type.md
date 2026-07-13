# Phase 01 - Public foundation content type

## Prompt for this phase

Add the `webshop` foundation as the fourth CMS content type and paid add-on
shell, but do not build products, cart, checkout, or payment logic yet. The goal
is an admin-only Webshop entry point that fits the existing CMS workflow,
prepares later private commerce phases, and keeps the free CMS usable when the
private add-on is missing.

## Goal

Create the minimum CMS foundation needed for a webshop:

- `webshop` appears as a content type next to `page`, `blog_post`, and
  `hero_slider`.
- Only users with the `admin` role can create `webshop`.
- Non-admin users cannot see the create card and cannot reach the create URL.
- Server Actions reject non-admin attempts even if the UI is bypassed.
- A `/dashboard/webshop` route exists as the future management dashboard.
- The public root for the shop can be rendered from the CMS content row later.
- No code in this phase imports from `.private/webshop` or from a future private
  package.

## Existing files to inspect first

- `db/schema.ts`
- `data/content.ts`
- `data/content-categories.ts`
- `app/dashboard/content/new/page.tsx`
- `app/dashboard/content/new/page/page.tsx`
- `app/dashboard/content/new/blog_post/page.tsx`
- `app/dashboard/content/new/hero_slider/page.tsx`
- `app/dashboard/content/actions.ts`
- `app/dashboard/content/content-form.tsx`
- `app/dashboard/content/page.tsx`
- `app/[slug]/page.tsx`
- `components/content-public-renderer.tsx`
- `components/site-admin-menu.tsx`
- `lib/roles.ts`
- related tests under `tests/`

## Architecture decision

Do not store product catalog data inside the existing `content` row. The
`content` row is only the public CMS-level shell for publication, slug, SEO,
status, visibility, preview, and routing.

Add a later private add-on `webshops` table that references the public
`content.id`. In this phase, it is acceptable to only add the content type and a
placeholder dashboard, but the code should not assume products live in
`content.content_json`.

This phase belongs in the public CMS repo. It is intentionally low-value from a
commercial perspective: it exposes the existence of a Webshop add-on, but none
of the product, cart, checkout, payment, order, or fulfillment implementation.

Because `content.category_id` is currently required, use one of these safe
options:

- Preferred: extend `content_categories.content_type` to include `webshop` and
  create/use a single system category such as `Webshop`.
- Alternative: make `content.category_id` nullable only if all existing
  content queries, forms, revision snapshots, and category counts are adjusted.

The preferred option has the smallest blast radius.

## Implementation tasks

1. Update database constraints and TypeScript types:
   - Add `webshop` to `content.content_type_check`.
   - Add `webshop` to `content_revisions.content_revisions_type_check`.
   - Update `data/content.ts` `ContentType`.
   - Update all content type normalizers and filters that hard-code the old
     three values.
   - Add `webshop` support to seed/default category logic if the repo has it.

2. Update create flow:
   - Add a Webshop card in `app/dashboard/content/new/page.tsx` only for admins.
   - Create `app/dashboard/content/new/webshop/page.tsx`.
   - The new page must redirect non-admins to `/dashboard`.
   - The new page should render a minimal create form or specialized minimal
     setup form. Keep product/catalog fields out of it.

3. Update server validation:
   - Extend `createSchema` with `webshop`.
   - Add an admin-only guard when `data.contentType === "webshop"`.
   - Add an admin-only guard for updates if the target content type is
     `webshop`.
   - Ensure publishers/authors cannot create, update, delete, restore, set
     status, or reassign webshop content unless the action intentionally allows
     it. First release should be admin-only.

4. Update category handling:
   - Extend category content type support where needed.
   - Implement or document a system category named `Webshop` for root content
     rows.
   - Do not use this system category as product category management.

5. Add dashboard placeholder:
   - Add `app/dashboard/webshop/page.tsx`.
   - Admin-only.
   - If no webshop content row exists, show a setup CTA.
   - If one exists, show navigation placeholders for Products, Categories,
     Orders, Payments, Storefront, Coupons, and Settings.
   - If the private add-on bridge is not installed yet, this page should remain
     a harmless placeholder. A later phase will replace the placeholder with an
     add-on-required/managed-platform/license/package-token setup prompt.
   - Add Webshop to `components/site-admin-menu.tsx` for admins.

6. Update public renderer:
   - Update `components/content-public-renderer.tsx` to handle `webshop` with a
     simple placeholder component or a future `WebshopPublicRenderer`.
   - Keep SEO behavior consistent with `app/[slug]/page.tsx`.

7. Keep Next.js 16 rules:
   - Await `params` and `searchParams`.
   - Do not create `middleware.ts`.
   - Use `proxy.ts` only if routing/protection changes are needed.

## Acceptance criteria

- Admin can see and create a Webshop content entry.
- Author/publisher cannot see the Webshop create card.
- Author/publisher direct navigation to `/dashboard/content/new/webshop`
  redirects or forbids.
- Server action rejects non-admin `contentType: "webshop"`.
- `/dashboard/webshop` is admin-only and visible from the admin menu.
- Existing page, blog post, and hero slider flows still work.
- A clean free CMS installation builds and runs without `.private/webshop`.
- Build/typecheck/lint/test pass.

## Tests to add or update

- Content type validation includes `webshop`.
- Non-admin create attempts return `{ error: "Forbidden." }`.
- Admin create succeeds with the system category.
- New content choice page renders Webshop only for admins.
- Public renderer does not crash for a published webshop row.

## Edge cases

- Existing migrations may have CHECK constraints. Update both schema and SQL
  migration.
- Existing content filters may assume only page/blog/hero. Update labels and
  filter options carefully.
- Hero sliders currently reuse page categories. Do not copy that shortcut for
  actual product categories.
- Do not solve licensing here. This phase only creates the public shell; license
  activation, managed-platform attestation, and private add-on loading start in
  Phase 02.
- If only one active webshop is allowed, enforce that in the server action and
  database with a partial unique index in a later schema phase.
