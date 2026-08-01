# Phase 05 - Private product galleries and digital assets

## Prompt for this phase

Integrate private Webshop product image galleries with the existing File Manager
and Gallery Manager, and add secure digital asset support for paid downloads.
Product galleries are managed in the paid Webshop add-on, appear read-only in
the existing Gallery Manager through a public bridge, and link back to the
product editor when the add-on is installed and licensed.

## Goal

Build:

- Product gallery management inside the Webshop product editor.
- Reuse of images uploaded via File Manager.
- Automatic read-only visibility in `/dashboard/gallerymanager`.
- Badge `Webshop gallery` in Gallery Manager.
- Link from read-only gallery to the product's Webshop editor.
- Secure digital asset management for digital products.

## Private add-on boundary

Product media rules, digital asset records, download entitlement logic, signed
download tokens, and private storage adapters belong in `.private/webshop`.

The public CMS may contain only:

- generic Gallery Manager metadata such as `origin`, `origin_type`, `origin_id`,
  and `locked`;
- read-only badges/links for `origin = 'webshop'`;
- fallback behavior if a Webshop gallery is opened while the add-on is missing
  or unlicensed;
- expired-license behavior that allows editing existing product media/assets
  but disables adding new products/assets/entitlement-generating flows;
- safe File Manager selection contracts.

Never put paid digital download serving logic in the public CMS repo. Normal CMS
files may remain public, but commerce downloads must be private or signed.

## Existing files to inspect first

- `db/schema.ts` gallery tables
- `data/galleries.ts`
- `app/dashboard/gallerymanager/page.tsx`
- `app/dashboard/gallerymanager/gallery-list.tsx`
- `app/dashboard/gallerymanager/[id]/page.tsx`
- `app/dashboard/gallerymanager/actions.ts`
- `app/dashboard/filemanager/*`
- `app/api/files/[id]/route.ts`
- `lib/file-storage.ts`
- `lib/file-manager.ts`
- `lib/file-upload-auth.ts`
- `lib/file-upload-tickets.ts`

## Product gallery model

Extend existing gallery behavior carefully. Recommended additions:

- Add to `galleries`:
  - `origin text not null default 'manual'`
  - `origin_type text`
  - `origin_id uuid`
  - `locked boolean not null default false`

Values:

- manual gallery:
  - `origin = 'manual'`
  - editable in Gallery Manager
- webshop product gallery:
  - `origin = 'webshop'`
  - `origin_type = 'product'`
  - `origin_id = webshop_products.id`
  - editable only from Webshop product editor

The generic `galleries` metadata change can live in the public CMS because it is
an extension point. Product-specific joins and all product media mutations
should live in the private add-on.

Alternative: create a separate `webshop_product_galleries` table that maps
product to existing gallery. If this is chosen, still add enough metadata for
Gallery Manager to display the badge and redirect.

## Gallery Manager behavior

In `/dashboard/gallerymanager`:

- Display webshop galleries in the list.
- Add a badge `Webshop gallery`.
- Disable edit/delete/reassign controls for webshop galleries.
- Clicking the row opens the Webshop product media section, not the regular
  gallery editor.
- If a user opens `/dashboard/gallerymanager/[id]` directly for a webshop
  gallery, render a read-only view with a button/link to the product editor.
- If the paid add-on is missing or unlicensed, render a non-crashing locked
  state instead of trying to import private product editor code.
- If the add-on is installed but the license expired, open existing product
  media in `edit_existing_only` mode and disable add-new-gallery/add-new-asset
  controls.

Permission rules:

- First release: admin-only management for webshop galleries.
- Existing manual gallery permissions remain unchanged.

## Product editor media behavior

Inside product editor:

- Create gallery automatically when first images are added.
- Select images from File Manager.
- Reorder images.
- Set cover image.
- Edit alt/title metadata if the existing file model allows it, or store
  product-specific alt text in a join table.
- Prevent non-image files from being added to product gallery.

Recommended product-specific join table:

- `webshop_product_images`
  - `product_id`
  - `file_id`
  - `position`
  - `alt_override`
  - `title_override`
  - `is_cover`

This table can coexist with existing `gallery_images` if the UI needs a true
CMS gallery row.

Create product-specific tables and actions in `.private/webshop`, not in public
CMS modules.

## Digital asset model

Digital products must not expose paid files through the normal public file URL.

Add:

- `webshop_digital_assets`
  - `id`
  - `product_id`
  - `variant_id nullable`
  - `file_id`
  - `version`
  - `filename_override`
  - `download_limit`
  - `download_expires_after_days`
  - `status`

- `webshop_download_entitlements`
  - `id`
  - `order_id`
  - `order_item_id`
  - `customer_user_id nullable`
  - `customer_email`
  - `digital_asset_id`
  - `download_count`
  - `download_limit`
  - `expires_at`
  - `revoked_at`

- `webshop_download_events`
  - entitlement id
  - ip hash
  - user agent
  - downloaded at

Download route:

- `/api/webshop/downloads/[token]`
- Token must be signed and short-lived.
- Route must verify entitlement, expiry, revocation, and download limit.
- Stream file through the server or redirect only to a private signed object URL.

## Storage warning

`lib/file-storage.ts` currently writes Vercel Blob objects with public access.
That is fine for normal CMS images but not enough for paid digital downloads.

Before launching digital products, implement one of:

- A private storage provider for digital assets.
- Signed private object URLs.
- Server-streamed local/private files.
- Separate storage bucket/provider for commerce downloads.

Do not sell digital files if the only available URL is public and stable.

## Acceptance criteria

- Product images can be selected from File Manager.
- Product gallery appears in Gallery Manager with `Webshop gallery` badge.
- Gallery Manager cannot edit/delete/reassign webshop galleries.
- Clicking a webshop gallery opens the product media editor.
- Opening a webshop gallery without installed/licensed add-on shows a safe
  fallback, not a runtime crash.
- Expired license allows editing existing product media metadata/order but
  disables creating new digital assets or new download entitlement flows.
- Digital product can attach a file as a digital asset.
- Digital asset download route requires a valid entitlement token.
- Existing manual galleries still work.
- Free CMS build/typecheck passes without private digital asset code.

## Tests to add or update

- Webshop gallery creation from product editor.
- Read-only Gallery Manager behavior for webshop galleries.
- Direct action calls cannot mutate webshop-origin galleries from Gallery
  Manager actions.
- Digital download route rejects missing/expired/revoked entitlement.
- Download count increments transactionally.
- Gallery Manager handles missing/unlicensed add-on state for webshop-origin
  galleries.
- Gallery/media actions enforce expired-license `edit_existing_only` mode.

## Edge cases

- Product deleted/archived: gallery should remain for order history or be
  archived, not blindly deleted.
- File deleted from File Manager while product references it: block deletion or
  show broken media warnings.
- Replacing a digital file must not change historical entitlements unless
  explicitly selected.
- Digital orders paid before file replacement should keep their purchased file
  version.
- Download links forwarded by a customer should still respect limits and expiry.
