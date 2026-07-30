import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { webshopAddonEntitlements } from "@/db/schema";

type WebshopPurgeClient = Pick<typeof db, "execute" | "update">;

// The webshop add-on currently has one installation-wide datastore. Keep this
// list explicit so a hard delete fails closed if a future table is not added
// here, instead of silently truncating an unrelated table.
export const WEBSHOP_DATA_TABLES = [
  "webshop_attributes",
  "webshop_audit_events",
  "webshop_cart_items",
  "webshop_carts",
  "webshop_categories",
  "webshop_category_attribute_exclusions",
  "webshop_category_attributes",
  "webshop_category_closure",
  "webshop_checkout_reservations",
  "webshop_checkout_sessions",
  "webshop_coupon_redemptions",
  "webshop_coupons",
  "webshop_digital_asset_files",
  "webshop_digital_assets",
  "webshop_download_entitlements",
  "webshop_download_events",
  "webshop_fulfillment_documents",
  "webshop_fulfillments",
  "webshop_license_keys",
  "webshop_license_server_catalog_items",
  "webshop_license_server_issues",
  "webshop_license_server_operations",
  "webshop_license_servers",
  "webshop_order_addresses",
  "webshop_order_delivery_confirmations",
  "webshop_order_items",
  "webshop_orders",
  "webshop_outbox_events",
  "webshop_payment_attempts",
  "webshop_payment_disputes",
  "webshop_payment_events",
  "webshop_payment_provider_references",
  "webshop_payments",
  "webshop_product_attribute_values",
  "webshop_product_categories",
  "webshop_product_media",
  "webshop_product_reviews",
  "webshop_product_variant_attribute_values",
  "webshop_product_variants",
  "webshop_products",
  "webshop_refund_items",
  "webshop_refunds",
  "webshop_related_products",
  "webshop_wishlist_items",
  "webshop_wishlists",
] as const;

const truncateWebshopDataSql = `TRUNCATE TABLE ${WEBSHOP_DATA_TABLES.map(
  (table) => `"${table}"`,
).join(", ")}`;

export async function purgeWebshopData(
  client: WebshopPurgeClient,
  actorId: string,
): Promise<void> {
  await client.execute(sql.raw(truncateWebshopDataSql));

  // Preserve the installed add-on entitlement/license so the administrator can
  // set up a fresh webshop without activating the purchased license again.
  // Store-specific settings live under this metadata key and must be reset.
  await client.update(webshopAddonEntitlements).set({
    metadata: sql`COALESCE(${webshopAddonEntitlements.metadata}, '{}'::jsonb) - 'settings'`,
    updatedBy: actorId,
  });
}
