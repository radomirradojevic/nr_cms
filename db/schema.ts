import {
  pgTable,
  text,
  timestamp,
  uuid,
  unique,
  boolean,
  jsonb,
  index,
  integer,
  bigint,
  date,
  uniqueIndex,
  check,
  primaryKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const contentCategories = pgTable(
  "content_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    contentType: text("content_type").notNull(), // "page" | "blog_post" | "webshop"
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    created: timestamp("created", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated: timestamp("updated", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("content_categories_name_type_unique").on(
      table.name,
      table.contentType,
    ),
  ],
);

export const content = pgTable(
  "content",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentType: text("content_type").notNull(), // "page" | "blog_post" | "hero_slider" | "webshop"
    categoryId: uuid("category_id")
      .notNull()
      .references(() => contentCategories.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    content: text("content"),
    contentJson: jsonb("content_json"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    status: text("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishAt: timestamp("publish_at", { withTimezone: true }),
    unpublishAt: timestamp("unpublish_at", { withTimezone: true }),
    excerpt: text("excerpt"),
    coverImage: text("cover_image"),
    slug: text("slug").notNull().unique(),
    authorId: text("author_id").notNull(),
    updatedBy: text("updated_by"),
    homepage: boolean("homepage").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by"),
    enableComments: boolean("enable_comments").notNull().default(false),
    autoPublishComments: boolean("auto_publish_comments")
      .notNull()
      .default(false),
    allowAnonymousComments: boolean("allow_anonymous_comments")
      .notNull()
      .default(false),
    visibility: jsonb("visibility")
      .notNull()
      .default(sql`'{"public":true,"roles":[]}'::jsonb`),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "content_type_check",
      sql`${table.contentType} IN ('page','blog_post','hero_slider','webshop')`,
    ),
    check(
      "content_status_check",
      sql`${table.status} IN ('draft','in_review','approved','published','archived')`,
    ),
    check(
      "content_schedule_window_check",
      sql`${table.unpublishAt} IS NULL OR ${table.publishAt} IS NULL OR ${table.unpublishAt} > ${table.publishAt}`,
    ),
    uniqueIndex("content_only_one_homepage")
      .on(table.homepage)
      .where(sql`${table.homepage} = true`),
    index("content_slug_idx").on(table.slug),
    index("content_status_idx").on(table.status),
    index("content_status_publish_at_idx").on(table.status, table.publishAt),
    index("content_status_unpublish_at_idx").on(
      table.status,
      table.unpublishAt,
    ),
    index("content_deleted_at_idx").on(table.deletedAt),
    index("content_type_idx").on(table.contentType),
    index("content_category_id_idx").on(table.categoryId),
    index("content_author_id_idx").on(table.authorId),
  ],
);

export const contentPreviewTokens = pgTable(
  "content_preview_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdBy: text("created_by").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("content_preview_tokens_hash_unique").on(table.tokenHash),
    index("content_preview_tokens_content_id_idx").on(table.contentId),
    index("content_preview_tokens_expires_at_idx").on(table.expiresAt),
  ],
);

export const contentRevisions = pgTable(
  "content_revisions",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    // Intentionally not an FK: deleted_snapshot revisions should survive a
    // content row delete for audit/history retention.
    contentId: uuid("content_id").notNull(),
    revisionNumber: integer("revision_number").notNull(),
    contentVersion: integer("content_version").notNull(),
    contentType: text("content_type").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    categoryId: uuid("category_id"),
    content: text("content"),
    contentJson: jsonb("content_json"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    excerpt: text("excerpt"),
    coverImage: text("cover_image"),
    status: text("status").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishAt: timestamp("publish_at", { withTimezone: true }),
    unpublishAt: timestamp("unpublish_at", { withTimezone: true }),
    homepage: boolean("homepage").notNull().default(false),
    visibility: jsonb("visibility")
      .notNull()
      .default(sql`'{"public":true,"roles":[]}'::jsonb`),
    enableComments: boolean("enable_comments").notNull().default(false),
    autoPublishComments: boolean("auto_publish_comments")
      .notNull()
      .default(false),
    allowAnonymousComments: boolean("allow_anonymous_comments")
      .notNull()
      .default(false),
    authorId: text("author_id").notNull(),
    updatedBy: text("updated_by"),
    createdBy: text("created_by").notNull(),
    changeType: text("change_type").notNull(),
    changeNote: text("change_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("content_revisions_content_number_unique").on(
      table.contentId,
      table.revisionNumber,
    ),
    index("content_revisions_content_created_idx").on(
      table.contentId,
      table.createdAt,
    ),
    index("content_revisions_created_by_idx").on(
      table.createdBy,
      table.createdAt,
    ),
    check(
      "content_revisions_type_check",
      sql`${table.contentType} IN ('page','blog_post','hero_slider','webshop')`,
    ),
    check(
      "content_revisions_status_check",
      sql`${table.status} IN ('draft','in_review','approved','published','archived')`,
    ),
    check(
      "content_revisions_schedule_window_check",
      sql`${table.unpublishAt} IS NULL OR ${table.publishAt} IS NULL OR ${table.unpublishAt} > ${table.publishAt}`,
    ),
    check(
      "content_revisions_change_type_check",
      sql`${table.changeType} IN ('created','saved','submitted_for_review','approved','published','unpublished','archived','scheduled','restored','deleted_snapshot')`,
    ),
  ],
);

export const menus = pgTable(
  "menus",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("menus_name_unique").on(table.name),
    index("menus_created_by_idx").on(table.createdBy),
  ],
);

export const topMenuItems = pgTable(
  "top_menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    menuId: uuid("menu_id")
      .notNull()
      .references(() => menus.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    url: text("url").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => topMenuItems.id, {
      onDelete: "cascade",
    }),
    order: integer("order").notNull().default(0),
    contentId: uuid("content_id").references(() => content.id, {
      onDelete: "set null",
    }),
    categoryId: uuid("category_id").references(() => contentCategories.id, {
      onDelete: "set null",
    }),
    target: text("target").notNull().default("_self"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "top_menu_items_target_check",
      sql`${table.target} IN ('_self','_blank')`,
    ),
    index("top_menu_items_menu_id_idx").on(table.menuId),
    index("top_menu_items_parent_id_idx").on(table.parentId),
    index("top_menu_items_menu_parent_order_idx").on(
      table.menuId,
      table.parentId,
      table.order,
    ),
    index("top_menu_items_parent_order_idx").on(table.parentId, table.order),
    index("top_menu_items_content_id_idx").on(table.contentId),
    index("top_menu_items_category_id_idx").on(table.categoryId),
  ],
);

export const fileFolders = pgTable(
  "file_folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => fileFolders.id, {
      onDelete: "restrict",
    }),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by"),
    created: timestamp("created", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated: timestamp("updated", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("file_folders_parent_name_unique")
      .on(table.parentId, table.normalizedName)
      .nullsNotDistinct(),
    index("file_folders_parent_idx").on(table.parentId),
    index("file_folders_created_by_idx").on(table.createdBy),
  ],
);

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    filename: text("filename").notNull(),
    storagePath: text("storage_path").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    kind: text("kind").notNull(), // "image" | "video" | "document"
    width: integer("width"),
    height: integer("height"),
    alt: text("alt"),
    title: text("title"),
    folderId: uuid("folder_id").references(() => fileFolders.id, {
      onDelete: "set null",
    }),
    uploadedBy: text("uploaded_by").notNull(),
    created: timestamp("created", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated: timestamp("updated", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "files_kind_check",
      sql`${table.kind} IN ('image','video','document')`,
    ),
    index("files_uploaded_by_idx").on(table.uploadedBy),
    index("files_kind_idx").on(table.kind),
    index("files_created_idx").on(table.created),
    index("files_mime_type_idx").on(table.mimeType),
    index("files_folder_id_idx").on(table.folderId),
  ],
);

export const galleries = pgTable(
  "galleries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    coverFileId: uuid("cover_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    origin: text("origin").notNull().default("manual"),
    originType: text("origin_type"),
    originId: uuid("origin_id"),
    locked: boolean("locked").notNull().default(false),
    createdBy: text("created_by").notNull(),
    created: timestamp("created", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated: timestamp("updated", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "galleries_origin_check",
      sql`${table.origin} IN ('manual','webshop')`,
    ),
    check(
      "galleries_origin_metadata_check",
      sql`(${table.origin} = 'manual' AND ${table.originType} IS NULL AND ${table.originId} IS NULL) OR (${table.origin} <> 'manual')`,
    ),
    index("galleries_created_by_idx").on(table.createdBy),
    index("galleries_created_idx").on(table.created),
    index("galleries_origin_idx").on(
      table.origin,
      table.originType,
      table.originId,
    ),
  ],
);

export const galleryImages = pgTable(
  "gallery_images",
  {
    galleryId: uuid("gallery_id")
      .notNull()
      .references(() => galleries.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    addedBy: text("added_by").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "gallery_images_pk",
      columns: [table.galleryId, table.fileId],
    }),
    index("gallery_images_gallery_position_idx").on(
      table.galleryId,
      table.position,
    ),
  ],
);

export const webshopAddonEntitlements = pgTable(
  "webshop_addon_entitlements",
  {
    id: integer("id").primaryKey().default(1),
    status: text("status").notNull().default("license_required"),
    licenseKeyRef: text("license_key_ref"),
    entitlementToken: text("entitlement_token"),
    provider: text("provider"),
    providerMode: text("provider_mode"),
    providerOwnerId: text("provider_owner_id"),
    providerProjectId: text("provider_project_id"),
    deploymentEnvironment: text("deployment_environment"),
    packageName: text("package_name"),
    packageVersion: text("package_version"),
    packageInstalledAt: timestamp("package_installed_at", {
      withTimezone: true,
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    features: jsonb("features")
      .notNull()
      .default(sql`'[]'::jsonb`),
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    updatedBy: text("updated_by"),
  },
  (table) => [
    check("webshop_addon_entitlements_singleton_check", sql`${table.id} = 1`),
    check(
      "webshop_addon_entitlements_status_check",
      sql`${table.status} IN ('license_required','ready','expired','invalid','install_pending')`,
    ),
    check(
      "webshop_addon_entitlements_provider_check",
      sql`${table.provider} IS NULL OR ${table.provider} IN ('vercel','self_hosted')`,
    ),
    check(
      "webshop_addon_entitlements_environment_check",
      sql`${table.deploymentEnvironment} IS NULL OR ${table.deploymentEnvironment} IN ('production','self_hosted')`,
    ),
  ],
);

export const webshopCategories = pgTable(
  "webshop_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => webshopCategories.id,
      { onDelete: "restrict" },
    ),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    imageFileId: uuid("image_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    status: text("status").notNull().default("draft"),
    position: integer("position").notNull().default(0),
    externalId: text("external_id"),
    showInNavigation: boolean("show_in_navigation").notNull().default(true),
    showInFilters: boolean("show_in_filters").notNull().default(true),
    canonicalCategoryId: uuid("canonical_category_id").references(
      (): AnyPgColumn => webshopCategories.id,
      { onDelete: "set null" },
    ),
    templatePresetId: text("template_preset_id"),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("webshop_categories_parent_slug_unique")
      .on(table.parentId, table.slug)
      .nullsNotDistinct(),
    check(
      "webshop_categories_status_check",
      sql`${table.status} IN ('draft','active','hidden','archived')`,
    ),
    check("webshop_categories_position_check", sql`${table.position} >= 0`),
    check(
      "webshop_categories_canonical_not_self_check",
      sql`${table.canonicalCategoryId} IS NULL OR ${table.canonicalCategoryId} <> ${table.id}`,
    ),
    index("webshop_categories_parent_position_idx").on(
      table.parentId,
      table.position,
      table.name,
    ),
    index("webshop_categories_status_idx").on(table.status),
    index("webshop_categories_image_file_id_idx").on(table.imageFileId),
    index("webshop_categories_canonical_category_id_idx").on(
      table.canonicalCategoryId,
    ),
  ],
);

export const webshopCategoryClosure = pgTable(
  "webshop_category_closure",
  {
    ancestorId: uuid("ancestor_id")
      .notNull()
      .references(() => webshopCategories.id, { onDelete: "cascade" }),
    descendantId: uuid("descendant_id")
      .notNull()
      .references(() => webshopCategories.id, { onDelete: "cascade" }),
    depth: integer("depth").notNull(),
  },
  (table) => [
    primaryKey({
      name: "webshop_category_closure_pk",
      columns: [table.ancestorId, table.descendantId],
    }),
    check("webshop_category_closure_depth_check", sql`${table.depth} >= 0`),
    index("webshop_category_closure_ancestor_depth_idx").on(
      table.ancestorId,
      table.depth,
    ),
    index("webshop_category_closure_descendant_depth_idx").on(
      table.descendantId,
      table.depth,
    ),
  ],
);

export const webshopAttributes = pgTable(
  "webshop_attributes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    type: text("type").notNull(),
    unit: text("unit"),
    options: jsonb("options")
      .notNull()
      .default(sql`'[]'::jsonb`),
    required: boolean("required").notNull().default(false),
    filterable: boolean("filterable").notNull().default(false),
    searchable: boolean("searchable").notNull().default(true),
    useRichTextEditor: boolean("use_rich_text_editor").notNull().default(false),
    showAsProductTab: boolean("show_as_product_tab").notNull().default(false),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("webshop_attributes_key_unique").on(table.key),
    check(
      "webshop_attributes_type_check",
      sql`${table.type} IN ('text','number','select','multi_select','color','boolean','date')`,
    ),
    index("webshop_attributes_type_idx").on(table.type),
    index("webshop_attributes_filterable_idx").on(table.filterable),
  ],
);

export const webshopCategoryAttributes = pgTable(
  "webshop_category_attributes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => webshopCategories.id, { onDelete: "cascade" }),
    attributeId: uuid("attribute_id")
      .notNull()
      .references(() => webshopAttributes.id, { onDelete: "restrict" }),
    position: integer("position").notNull().default(0),
    required: boolean("required"),
    filterable: boolean("filterable"),
    searchable: boolean("searchable"),
    scope: text("scope").notNull().default("product"),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("webshop_category_attributes_category_attribute_unique").on(
      table.categoryId,
      table.attributeId,
    ),
    check(
      "webshop_category_attributes_position_check",
      sql`${table.position} >= 0`,
    ),
    check(
      "webshop_category_attributes_scope_check",
      sql`${table.scope} IN ('product','variant')`,
    ),
    index("webshop_category_attributes_category_position_idx").on(
      table.categoryId,
      table.position,
    ),
    index("webshop_category_attributes_attribute_idx").on(table.attributeId),
    index("webshop_category_attributes_scope_idx").on(table.scope),
  ],
);

export const webshopCategoryAttributeExclusions = pgTable(
  "webshop_category_attribute_exclusions",
  {
    categoryId: uuid("category_id")
      .notNull()
      .references(() => webshopCategories.id, { onDelete: "cascade" }),
    attributeId: uuid("attribute_id")
      .notNull()
      .references(() => webshopAttributes.id, { onDelete: "restrict" }),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "webshop_category_attribute_exclusions_pk",
      columns: [table.categoryId, table.attributeId],
    }),
    index("webshop_category_attribute_exclusions_attribute_idx").on(
      table.attributeId,
    ),
  ],
);

export const webshopProducts = pgTable(
  "webshop_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productType: text("product_type").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    descriptionJson: jsonb("description_json"),
    excerpt: text("excerpt"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    canonicalUrl: text("canonical_url"),
    status: text("status").notNull().default("draft"),
    primaryCategoryId: uuid("primary_category_id").references(
      () => webshopCategories.id,
      { onDelete: "restrict" },
    ),
    coverImageFileId: uuid("cover_image_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    galleryId: uuid("gallery_id").references(() => galleries.id, {
      onDelete: "set null",
    }),
    basePriceMinor: bigint("base_price_minor", { mode: "number" })
      .notNull()
      .default(0),
    compareAtPriceMinor: bigint("compare_at_price_minor", { mode: "number" }),
    currency: text("currency").notNull().default("RSD"),
    taxCategory: text("tax_category"),
    variantOptions: jsonb("variant_options")
      .notNull()
      .default(sql`'[]'::jsonb`),
    requiresShipping: boolean("requires_shipping").notNull().default(false),
    inventoryTracked: boolean("inventory_tracked").notNull().default(false),
    stockPolicy: text("stock_policy").notNull().default("deny"),
    lowStockThreshold: integer("low_stock_threshold"),
    physicalFields: jsonb("physical_fields")
      .notNull()
      .default(sql`'{}'::jsonb`),
    digitalFields: jsonb("digital_fields")
      .notNull()
      .default(sql`'{}'::jsonb`),
    serviceFields: jsonb("service_fields")
      .notNull()
      .default(sql`'{}'::jsonb`),
    ratingsEnabled: boolean("ratings_enabled").notNull().default(false),
    autoPublishRatings: boolean("auto_publish_ratings")
      .notNull()
      .default(false),
    ratingsVisibility: text("ratings_visibility").notNull().default("public"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("webshop_products_slug_unique").on(table.slug),
    check(
      "webshop_products_type_check",
      sql`${table.productType} IN ('physical','digital','service')`,
    ),
    check(
      "webshop_products_status_check",
      sql`${table.status} IN ('draft','active','hidden','archived')`,
    ),
    check(
      "webshop_products_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "webshop_products_base_price_check",
      sql`${table.basePriceMinor} >= 0`,
    ),
    check(
      "webshop_products_compare_price_check",
      sql`${table.compareAtPriceMinor} IS NULL OR ${table.compareAtPriceMinor} >= 0`,
    ),
    check(
      "webshop_products_stock_policy_check",
      sql`${table.stockPolicy} IN ('deny','allow_backorder','preorder')`,
    ),
    check(
      "webshop_products_low_stock_threshold_check",
      sql`${table.lowStockThreshold} IS NULL OR ${table.lowStockThreshold} >= 0`,
    ),
    check(
      "webshop_products_ratings_visibility_check",
      sql`${table.ratingsVisibility} IN ('public','authenticated','hidden')`,
    ),
    index("webshop_products_status_updated_idx").on(
      table.status,
      table.updatedAt,
    ),
    index("webshop_products_type_idx").on(table.productType),
    index("webshop_products_primary_category_idx").on(table.primaryCategoryId),
    index("webshop_products_price_idx").on(table.basePriceMinor),
    index("webshop_products_cover_image_idx").on(table.coverImageFileId),
    index("webshop_products_gallery_idx").on(table.galleryId),
  ],
);

export const webshopProductCategories = pgTable(
  "webshop_product_categories",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => webshopProducts.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => webshopCategories.id, { onDelete: "restrict" }),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (table) => [
    primaryKey({
      name: "webshop_product_categories_pk",
      columns: [table.productId, table.categoryId],
    }),
    uniqueIndex("webshop_product_categories_primary_unique")
      .on(table.productId)
      .where(sql`${table.isPrimary} = true`),
    index("webshop_product_categories_category_idx").on(table.categoryId),
  ],
);

export const webshopProductMedia = pgTable(
  "webshop_product_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => webshopProducts.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => webshopProductVariants.id, {
      onDelete: "set null",
    }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "restrict" }),
    role: text("role").notNull().default("gallery"),
    alt: text("alt"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("webshop_product_media_product_file_variant_unique")
      .on(table.productId, table.fileId, table.variantId)
      .nullsNotDistinct(),
    check(
      "webshop_product_media_role_check",
      sql`${table.role} IN ('cover','gallery')`,
    ),
    check("webshop_product_media_position_check", sql`${table.position} >= 0`),
    index("webshop_product_media_product_position_idx").on(
      table.productId,
      table.position,
    ),
    index("webshop_product_media_file_idx").on(table.fileId),
    index("webshop_product_media_variant_idx").on(table.variantId),
  ],
);

export const webshopProductVariants = pgTable(
  "webshop_product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => webshopProducts.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("active"),
    priceMinor: bigint("price_minor", { mode: "number" }),
    compareAtPriceMinor: bigint("compare_at_price_minor", { mode: "number" }),
    currency: text("currency").notNull().default("RSD"),
    optionValues: jsonb("option_values")
      .notNull()
      .default(sql`'{}'::jsonb`),
    inventoryTracked: boolean("inventory_tracked").notNull().default(false),
    stockOnHand: integer("stock_on_hand").notNull().default(0),
    stockReserved: integer("stock_reserved").notNull().default(0),
    stockPolicy: text("stock_policy").notNull().default("deny"),
    lowStockThreshold: integer("low_stock_threshold"),
    weightGrams: integer("weight_grams"),
    dimensions: jsonb("dimensions")
      .notNull()
      .default(sql`'{}'::jsonb`),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("webshop_product_variants_sku_unique").on(table.sku),
    check(
      "webshop_product_variants_status_check",
      sql`${table.status} IN ('active','hidden','archived')`,
    ),
    check(
      "webshop_product_variants_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "webshop_product_variants_price_check",
      sql`${table.priceMinor} IS NULL OR ${table.priceMinor} >= 0`,
    ),
    check(
      "webshop_product_variants_compare_price_check",
      sql`${table.compareAtPriceMinor} IS NULL OR ${table.compareAtPriceMinor} >= 0`,
    ),
    check(
      "webshop_product_variants_stock_check",
      sql`${table.stockOnHand} >= 0 AND ${table.stockReserved} >= 0`,
    ),
    check(
      "webshop_product_variants_stock_policy_check",
      sql`${table.stockPolicy} IN ('deny','allow_backorder','preorder')`,
    ),
    check(
      "webshop_product_variants_low_stock_threshold_check",
      sql`${table.lowStockThreshold} IS NULL OR ${table.lowStockThreshold} >= 0`,
    ),
    check(
      "webshop_product_variants_weight_check",
      sql`${table.weightGrams} IS NULL OR ${table.weightGrams} >= 0`,
    ),
    index("webshop_product_variants_product_position_idx").on(
      table.productId,
      table.position,
    ),
    index("webshop_product_variants_status_idx").on(table.status),
  ],
);

export const webshopDigitalAssetFiles = pgTable(
  "webshop_digital_asset_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    filename: text("filename").notNull(),
    storagePath: text("storage_path").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: text("uploaded_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("webshop_digital_asset_files_uploaded_by_idx").on(table.uploadedBy),
    index("webshop_digital_asset_files_created_idx").on(table.createdAt),
    index("webshop_digital_asset_files_mime_type_idx").on(table.mimeType),
  ],
);

export const webshopDigitalAssets = pgTable(
  "webshop_digital_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => webshopProducts.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => webshopProductVariants.id, {
      onDelete: "set null",
    }),
    assetFileId: uuid("asset_file_id").references(
      () => webshopDigitalAssetFiles.id,
      { onDelete: "restrict" },
    ),
    fileId: uuid("file_id").references(() => files.id, {
      onDelete: "restrict",
    }),
    version: text("version").notNull().default("1"),
    filenameOverride: text("filename_override"),
    downloadLimit: integer("download_limit"),
    downloadExpiresAfterDays: integer("download_expires_after_days"),
    status: text("status").notNull().default("active"),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "webshop_digital_assets_status_check",
      sql`${table.status} IN ('active','disabled','archived')`,
    ),
    check(
      "webshop_digital_assets_download_limit_check",
      sql`${table.downloadLimit} IS NULL OR ${table.downloadLimit} >= 0`,
    ),
    check(
      "webshop_digital_assets_expiry_check",
      sql`${table.downloadExpiresAfterDays} IS NULL OR ${table.downloadExpiresAfterDays} >= 0`,
    ),
    check(
      "webshop_digital_assets_file_source_check",
      sql`${table.assetFileId} IS NOT NULL OR ${table.fileId} IS NOT NULL`,
    ),
    index("webshop_digital_assets_product_idx").on(table.productId),
    index("webshop_digital_assets_variant_idx").on(table.variantId),
    index("webshop_digital_assets_asset_file_idx").on(table.assetFileId),
    index("webshop_digital_assets_file_idx").on(table.fileId),
    index("webshop_digital_assets_status_idx").on(table.status),
  ],
);

export const webshopDownloadEntitlements = pgTable(
  "webshop_download_entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull(),
    orderId: text("order_id").notNull(),
    orderItemId: text("order_item_id").notNull(),
    customerUserId: text("customer_user_id"),
    customerEmail: text("customer_email").notNull(),
    digitalAssetId: uuid("digital_asset_id")
      .notNull()
      .references(() => webshopDigitalAssets.id, { onDelete: "restrict" }),
    downloadCount: integer("download_count").notNull().default(0),
    downloadLimit: integer("download_limit"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("webshop_download_entitlements_token_hash_unique").on(
      table.tokenHash,
    ),
    check(
      "webshop_download_entitlements_count_check",
      sql`${table.downloadCount} >= 0`,
    ),
    check(
      "webshop_download_entitlements_limit_check",
      sql`${table.downloadLimit} IS NULL OR ${table.downloadLimit} >= 0`,
    ),
    index("webshop_download_entitlements_asset_idx").on(table.digitalAssetId),
    index("webshop_download_entitlements_customer_user_idx").on(
      table.customerUserId,
    ),
    index("webshop_download_entitlements_customer_email_idx").on(
      table.customerEmail,
    ),
    index("webshop_download_entitlements_order_idx").on(
      table.orderId,
      table.orderItemId,
    ),
    uniqueIndex("webshop_download_entitlements_order_item_asset_unique").on(
      table.orderId,
      table.orderItemId,
      table.digitalAssetId,
    ),
    index("webshop_download_entitlements_expires_idx").on(table.expiresAt),
  ],
);

export const webshopDownloadEvents = pgTable(
  "webshop_download_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entitlementId: uuid("entitlement_id")
      .notNull()
      .references(() => webshopDownloadEntitlements.id, {
        onDelete: "cascade",
      }),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    downloadedAt: timestamp("downloaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("webshop_download_events_entitlement_idx").on(table.entitlementId),
    index("webshop_download_events_downloaded_idx").on(table.downloadedAt),
  ],
);

export const webshopCarts = pgTable(
  "webshop_carts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    webshopId: uuid("webshop_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    customerUserId: text("customer_user_id"),
    anonymousTokenHash: text("anonymous_token_hash"),
    couponCode: text("coupon_code"),
    currency: text("currency").notNull().default("RSD"),
    status: text("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "webshop_carts_status_check",
      sql`${table.status} IN ('active','converted','abandoned','expired')`,
    ),
    check(
      "webshop_carts_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "webshop_carts_owner_check",
      sql`${table.customerUserId} IS NOT NULL OR ${table.anonymousTokenHash} IS NOT NULL`,
    ),
    uniqueIndex("webshop_carts_active_customer_unique")
      .on(table.webshopId, table.customerUserId)
      .where(
        sql`${table.status} = 'active' AND ${table.customerUserId} IS NOT NULL`,
      ),
    uniqueIndex("webshop_carts_active_anonymous_unique")
      .on(table.webshopId, table.anonymousTokenHash)
      .where(
        sql`${table.status} = 'active' AND ${table.anonymousTokenHash} IS NOT NULL`,
      ),
    index("webshop_carts_webshop_status_idx").on(table.webshopId, table.status),
    index("webshop_carts_customer_idx").on(table.customerUserId),
    index("webshop_carts_anonymous_token_idx").on(table.anonymousTokenHash),
    index("webshop_carts_expires_idx").on(table.expiresAt),
  ],
);

export const webshopCartItems = pgTable(
  "webshop_cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => webshopCarts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => webshopProducts.id, { onDelete: "restrict" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => webshopProductVariants.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    unitPriceMinorSnapshot: bigint("unit_price_minor_snapshot", {
      mode: "number",
    })
      .notNull()
      .default(0),
    currencySnapshot: text("currency_snapshot").notNull().default("RSD"),
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("webshop_cart_items_quantity_check", sql`${table.quantity} > 0`),
    check(
      "webshop_cart_items_price_check",
      sql`${table.unitPriceMinorSnapshot} >= 0`,
    ),
    check(
      "webshop_cart_items_currency_check",
      sql`${table.currencySnapshot} ~ '^[A-Z]{3}$'`,
    ),
    index("webshop_cart_items_cart_idx").on(table.cartId),
    index("webshop_cart_items_product_idx").on(table.productId),
    index("webshop_cart_items_variant_idx").on(table.variantId),
    uniqueIndex("webshop_cart_items_cart_variant_unique").on(
      table.cartId,
      table.variantId,
    ),
  ],
);

export const webshopCheckoutSessions = pgTable(
  "webshop_checkout_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    webshopId: uuid("webshop_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => webshopCarts.id, { onDelete: "restrict" }),
    customerUserId: text("customer_user_id"),
    confirmationTokenHash: text("confirmation_token_hash"),
    email: text("email").notNull(),
    billingAddress: jsonb("billing_address")
      .notNull()
      .default(sql`'{}'::jsonb`),
    shippingAddress: jsonb("shipping_address")
      .notNull()
      .default(sql`'{}'::jsonb`),
    shippingMethodId: text("shipping_method_id"),
    couponIds: jsonb("coupon_ids")
      .notNull()
      .default(sql`'[]'::jsonb`),
    subtotalMinor: bigint("subtotal_minor", { mode: "number" })
      .notNull()
      .default(0),
    discountMinor: bigint("discount_minor", { mode: "number" })
      .notNull()
      .default(0),
    taxMinor: bigint("tax_minor", { mode: "number" }).notNull().default(0),
    shippingMinor: bigint("shipping_minor", { mode: "number" })
      .notNull()
      .default(0),
    totalMinor: bigint("total_minor", { mode: "number" }).notNull().default(0),
    currency: text("currency").notNull().default("RSD"),
    status: text("status").notNull().default("open"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "webshop_checkout_sessions_status_check",
      sql`${table.status} IN ('open','pending_payment','completed','expired','canceled')`,
    ),
    check(
      "webshop_checkout_sessions_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "webshop_checkout_sessions_totals_check",
      sql`${table.subtotalMinor} >= 0 AND ${table.discountMinor} >= 0 AND ${table.taxMinor} >= 0 AND ${table.shippingMinor} >= 0 AND ${table.totalMinor} >= 0`,
    ),
    uniqueIndex("webshop_checkout_sessions_confirmation_unique")
      .on(table.confirmationTokenHash)
      .where(sql`${table.confirmationTokenHash} IS NOT NULL`),
    index("webshop_checkout_sessions_webshop_status_idx").on(
      table.webshopId,
      table.status,
    ),
    index("webshop_checkout_sessions_cart_idx").on(table.cartId),
    index("webshop_checkout_sessions_customer_idx").on(table.customerUserId),
    index("webshop_checkout_sessions_expires_idx").on(table.expiresAt),
  ],
);

export const webshopCheckoutReservations = pgTable(
  "webshop_checkout_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    checkoutSessionId: uuid("checkout_session_id")
      .notNull()
      .references(() => webshopCheckoutSessions.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => webshopProductVariants.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    status: text("status").notNull().default("reserved"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "webshop_checkout_reservations_quantity_check",
      sql`${table.quantity} > 0`,
    ),
    check(
      "webshop_checkout_reservations_status_check",
      sql`${table.status} IN ('reserved','released','converted')`,
    ),
    uniqueIndex("webshop_checkout_reservations_session_variant_unique").on(
      table.checkoutSessionId,
      table.variantId,
    ),
    index("webshop_checkout_reservations_session_idx").on(
      table.checkoutSessionId,
    ),
    index("webshop_checkout_reservations_variant_idx").on(table.variantId),
    index("webshop_checkout_reservations_expires_idx").on(table.expiresAt),
  ],
);

export const webshopOrders = pgTable(
  "webshop_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    webshopId: uuid("webshop_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    orderNumber: text("order_number").notNull(),
    checkoutSessionId: uuid("checkout_session_id")
      .notNull()
      .references(() => webshopCheckoutSessions.id, { onDelete: "restrict" }),
    confirmationTokenHash: text("confirmation_token_hash"),
    customerUserId: text("customer_user_id"),
    customerEmail: text("customer_email").notNull(),
    status: text("status").notNull().default("pending_payment"),
    paymentStatus: text("payment_status").notNull().default("unpaid"),
    fulfillmentStatus: text("fulfillment_status")
      .notNull()
      .default("unfulfilled"),
    subtotalMinor: bigint("subtotal_minor", { mode: "number" })
      .notNull()
      .default(0),
    discountMinor: bigint("discount_minor", { mode: "number" })
      .notNull()
      .default(0),
    taxMinor: bigint("tax_minor", { mode: "number" }).notNull().default(0),
    shippingMinor: bigint("shipping_minor", { mode: "number" })
      .notNull()
      .default(0),
    totalMinor: bigint("total_minor", { mode: "number" }).notNull().default(0),
    currency: text("currency").notNull().default("RSD"),
    discountSnapshot: jsonb("discount_snapshot")
      .notNull()
      .default(sql`'{}'::jsonb`),
    internalNotes: text("internal_notes"),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("webshop_orders_webshop_order_number_unique").on(
      table.webshopId,
      table.orderNumber,
    ),
    uniqueIndex("webshop_orders_checkout_session_unique").on(
      table.checkoutSessionId,
    ),
    uniqueIndex("webshop_orders_confirmation_token_unique")
      .on(table.confirmationTokenHash)
      .where(sql`${table.confirmationTokenHash} IS NOT NULL`),
    check(
      "webshop_orders_status_check",
      sql`${table.status} IN ('pending_payment','confirmed','processing','fulfilled','completed','canceled','refunded')`,
    ),
    check(
      "webshop_orders_payment_status_check",
      sql`${table.paymentStatus} IN ('unpaid','pending','authorized','paid','partially_refunded','refunded','failed')`,
    ),
    check(
      "webshop_orders_fulfillment_status_check",
      sql`${table.fulfillmentStatus} IN ('unfulfilled','partial','fulfilled','not_required')`,
    ),
    check(
      "webshop_orders_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "webshop_orders_totals_check",
      sql`${table.subtotalMinor} >= 0 AND ${table.discountMinor} >= 0 AND ${table.taxMinor} >= 0 AND ${table.shippingMinor} >= 0 AND ${table.totalMinor} >= 0`,
    ),
    index("webshop_orders_webshop_created_idx").on(
      table.webshopId,
      table.createdAt,
    ),
    index("webshop_orders_status_idx").on(table.status, table.paymentStatus),
    index("webshop_orders_customer_idx").on(table.customerUserId),
    index("webshop_orders_email_idx").on(table.customerEmail),
  ],
);

export const webshopOrderItems = pgTable(
  "webshop_order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => webshopOrders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => webshopProducts.id, {
      onDelete: "set null",
    }),
    variantId: uuid("variant_id").references(() => webshopProductVariants.id, {
      onDelete: "set null",
    }),
    titleSnapshot: text("title_snapshot").notNull(),
    variantTitleSnapshot: text("variant_title_snapshot").notNull(),
    skuSnapshot: text("sku_snapshot").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceMinorSnapshot: bigint("unit_price_minor_snapshot", {
      mode: "number",
    })
      .notNull()
      .default(0),
    discountMinorSnapshot: bigint("discount_minor_snapshot", {
      mode: "number",
    })
      .notNull()
      .default(0),
    taxMinorSnapshot: bigint("tax_minor_snapshot", { mode: "number" })
      .notNull()
      .default(0),
    currencySnapshot: text("currency_snapshot").notNull().default("RSD"),
    productTypeSnapshot: text("product_type_snapshot").notNull(),
    fulfillmentDataSnapshot: jsonb("fulfillment_data_snapshot")
      .notNull()
      .default(sql`'{}'::jsonb`),
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("webshop_order_items_quantity_check", sql`${table.quantity} > 0`),
    check(
      "webshop_order_items_price_check",
      sql`${table.unitPriceMinorSnapshot} >= 0 AND ${table.discountMinorSnapshot} >= 0 AND ${table.taxMinorSnapshot} >= 0`,
    ),
    check(
      "webshop_order_items_currency_check",
      sql`${table.currencySnapshot} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "webshop_order_items_product_type_check",
      sql`${table.productTypeSnapshot} IN ('physical','digital','service')`,
    ),
    index("webshop_order_items_order_idx").on(table.orderId),
    index("webshop_order_items_product_idx").on(table.productId),
    index("webshop_order_items_variant_idx").on(table.variantId),
  ],
);

export const webshopLicenseKeys = pgTable(
  "webshop_license_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => webshopProducts.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => webshopProductVariants.id, {
      onDelete: "set null",
    }),
    licenseKey: text("license_key").notNull(),
    licenseKeyFingerprint: text("license_key_fingerprint").notNull(),
    status: text("status").notNull().default("available"),
    orderId: uuid("order_id").references(() => webshopOrders.id, {
      onDelete: "set null",
    }),
    orderItemId: uuid("order_item_id").references(() => webshopOrderItems.id, {
      onDelete: "set null",
    }),
    customerEmail: text("customer_email"),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    validityDays: integer("validity_days"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    notes: text("notes"),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("webshop_license_keys_fingerprint_unique").on(
      table.licenseKeyFingerprint,
    ),
    uniqueIndex("webshop_license_keys_order_item_unique")
      .on(table.orderItemId)
      .where(sql`${table.orderItemId} IS NOT NULL`),
    check(
      "webshop_license_keys_status_check",
      sql`${table.status} IN ('available','assigned','revoked')`,
    ),
    check(
      "webshop_license_keys_assignment_check",
      sql`(${table.status} <> 'assigned') OR (${table.orderId} IS NOT NULL AND ${table.orderItemId} IS NOT NULL AND ${table.assignedAt} IS NOT NULL)`,
    ),
    check(
      "webshop_license_keys_validity_days_check",
      sql`${table.validityDays} IS NULL OR ${table.validityDays} > 0`,
    ),
    index("webshop_license_keys_product_status_idx").on(
      table.productId,
      table.status,
      table.createdAt,
    ),
    index("webshop_license_keys_variant_status_idx").on(
      table.variantId,
      table.status,
    ),
    index("webshop_license_keys_order_idx").on(
      table.orderId,
      table.orderItemId,
    ),
    index("webshop_license_keys_expires_idx").on(table.expiresAt),
  ],
);

export const webshopOrderAddresses = pgTable(
  "webshop_order_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => webshopOrders.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    snapshot: jsonb("snapshot")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "webshop_order_addresses_type_check",
      sql`${table.type} IN ('billing','shipping')`,
    ),
    uniqueIndex("webshop_order_addresses_order_type_unique").on(
      table.orderId,
      table.type,
    ),
    index("webshop_order_addresses_order_idx").on(table.orderId),
  ],
);

export const webshopPayments = pgTable(
  "webshop_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => webshopOrders.id, { onDelete: "cascade" }),
    checkoutSessionId: uuid("checkout_session_id")
      .notNull()
      .references(() => webshopCheckoutSessions.id, { onDelete: "restrict" }),
    providerKey: text("provider_key").notNull(),
    providerReference: text("provider_reference").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" })
      .notNull()
      .default(0),
    currency: text("currency").notNull().default("RSD"),
    status: text("status").notNull().default("pending"),
    idempotencyKey: text("idempotency_key").notNull(),
    rawSafeMetadata: jsonb("raw_safe_metadata")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("webshop_payments_provider_reference_unique").on(
      table.providerKey,
      table.providerReference,
    ),
    uniqueIndex("webshop_payments_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
    check(
      "webshop_payments_provider_key_check",
      sql`${table.providerKey} IN ('cash_on_delivery','stripe','paypal','bank_redirect','ips_qr','local_card_gateway')`,
    ),
    check(
      "webshop_payments_status_check",
      sql`${table.status} IN ('pending','authorized','paid','failed','canceled','partially_refunded','refunded')`,
    ),
    check("webshop_payments_amount_check", sql`${table.amountMinor} >= 0`),
    check(
      "webshop_payments_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    index("webshop_payments_order_idx").on(table.orderId),
    index("webshop_payments_checkout_idx").on(table.checkoutSessionId),
    index("webshop_payments_status_idx").on(table.status),
  ],
);

export const webshopPaymentEvents = pgTable(
  "webshop_payment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerKey: text("provider_key").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    eventType: text("event_type").notNull(),
    signatureVerificationStatus: text("signature_verification_status")
      .notNull()
      .default("verified"),
    paymentId: uuid("payment_id").references(() => webshopPayments.id, {
      onDelete: "set null",
    }),
    orderId: uuid("order_id").references(() => webshopOrders.id, {
      onDelete: "set null",
    }),
    rawSafeMetadata: jsonb("raw_safe_metadata")
      .notNull()
      .default(sql`'{}'::jsonb`),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("webshop_payment_events_provider_event_unique").on(
      table.providerKey,
      table.providerEventId,
    ),
    check(
      "webshop_payment_events_provider_key_check",
      sql`${table.providerKey} IN ('cash_on_delivery','stripe','paypal','bank_redirect','ips_qr','local_card_gateway')`,
    ),
    check(
      "webshop_payment_events_signature_status_check",
      sql`${table.signatureVerificationStatus} IN ('verified','failed','skipped')`,
    ),
    index("webshop_payment_events_payment_idx").on(table.paymentId),
    index("webshop_payment_events_order_idx").on(table.orderId),
    index("webshop_payment_events_type_idx").on(
      table.providerKey,
      table.eventType,
    ),
  ],
);

export const webshopFulfillments = pgTable(
  "webshop_fulfillments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => webshopOrders.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("fulfilled"),
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    notes: text("notes"),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "webshop_fulfillments_status_check",
      sql`${table.status} IN ('pending','fulfilled','canceled')`,
    ),
    index("webshop_fulfillments_order_idx").on(table.orderId),
    index("webshop_fulfillments_status_idx").on(table.status),
  ],
);

export const webshopOrderDeliveryConfirmations = pgTable(
  "webshop_order_delivery_confirmations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => webshopOrders.id, { onDelete: "cascade" }),
    customerUserId: text("customer_user_id").notNull(),
    message: text("message"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("webshop_order_delivery_confirmations_order_unique").on(
      table.orderId,
    ),
    index("webshop_order_delivery_confirmations_customer_idx").on(
      table.customerUserId,
    ),
    index("webshop_order_delivery_confirmations_confirmed_idx").on(
      table.confirmedAt,
    ),
    check(
      "webshop_order_delivery_confirmations_message_length_check",
      sql`${table.message} IS NULL OR char_length(${table.message}) <= 2000`,
    ),
  ],
);

export const webshopRefunds = pgTable(
  "webshop_refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => webshopOrders.id, { onDelete: "cascade" }),
    paymentId: uuid("payment_id").references(() => webshopPayments.id, {
      onDelete: "set null",
    }),
    providerReference: text("provider_reference"),
    amountMinor: bigint("amount_minor", { mode: "number" })
      .notNull()
      .default(0),
    currency: text("currency").notNull().default("RSD"),
    status: text("status").notNull().default("pending"),
    reason: text("reason"),
    rawSafeMetadata: jsonb("raw_safe_metadata")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "webshop_refunds_status_check",
      sql`${table.status} IN ('pending','succeeded','failed','canceled')`,
    ),
    check("webshop_refunds_amount_check", sql`${table.amountMinor} > 0`),
    check(
      "webshop_refunds_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    index("webshop_refunds_order_idx").on(table.orderId),
    index("webshop_refunds_payment_idx").on(table.paymentId),
    index("webshop_refunds_status_idx").on(table.status),
  ],
);

export const webshopCoupons = pgTable(
  "webshop_coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    webshopId: uuid("webshop_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("draft"),
    discountType: text("discount_type").notNull(),
    discountValue: integer("discount_value").notNull().default(0),
    currency: text("currency"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    usageLimit: integer("usage_limit"),
    usageLimitPerCustomer: integer("usage_limit_per_customer"),
    minimumSubtotalMinor: bigint("minimum_subtotal_minor", { mode: "number" })
      .notNull()
      .default(0),
    appliesTo: jsonb("applies_to")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("webshop_coupons_webshop_code_unique").on(
      table.webshopId,
      table.code,
    ),
    check(
      "webshop_coupons_status_check",
      sql`${table.status} IN ('draft','active','paused','archived')`,
    ),
    check(
      "webshop_coupons_discount_type_check",
      sql`${table.discountType} IN ('percent','fixed_amount','free_shipping')`,
    ),
    check(
      "webshop_coupons_discount_value_check",
      sql`${table.discountValue} >= 0`,
    ),
    check(
      "webshop_coupons_percent_value_check",
      sql`${table.discountType} <> 'percent' OR ${table.discountValue} <= 100`,
    ),
    check(
      "webshop_coupons_currency_check",
      sql`${table.currency} IS NULL OR ${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "webshop_coupons_dates_check",
      sql`${table.endsAt} IS NULL OR ${table.startsAt} IS NULL OR ${table.endsAt} > ${table.startsAt}`,
    ),
    check(
      "webshop_coupons_usage_limit_check",
      sql`${table.usageLimit} IS NULL OR ${table.usageLimit} >= 0`,
    ),
    check(
      "webshop_coupons_customer_usage_limit_check",
      sql`${table.usageLimitPerCustomer} IS NULL OR ${table.usageLimitPerCustomer} >= 0`,
    ),
    check(
      "webshop_coupons_minimum_subtotal_check",
      sql`${table.minimumSubtotalMinor} >= 0`,
    ),
    index("webshop_coupons_webshop_status_idx").on(
      table.webshopId,
      table.status,
    ),
    index("webshop_coupons_code_idx").on(table.code),
  ],
);

export const webshopCouponRedemptions = pgTable(
  "webshop_coupon_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => webshopCoupons.id, { onDelete: "restrict" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => webshopOrders.id, { onDelete: "cascade" }),
    customerUserId: text("customer_user_id"),
    customerEmail: text("customer_email").notNull(),
    discountMinor: bigint("discount_minor", { mode: "number" })
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "webshop_coupon_redemptions_discount_check",
      sql`${table.discountMinor} >= 0`,
    ),
    uniqueIndex("webshop_coupon_redemptions_coupon_order_unique").on(
      table.couponId,
      table.orderId,
    ),
    index("webshop_coupon_redemptions_coupon_idx").on(table.couponId),
    index("webshop_coupon_redemptions_order_idx").on(table.orderId),
    index("webshop_coupon_redemptions_customer_user_idx").on(
      table.customerUserId,
    ),
    index("webshop_coupon_redemptions_customer_email_idx").on(
      table.customerEmail,
    ),
  ],
);

export const webshopWishlists = pgTable(
  "webshop_wishlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    webshopId: uuid("webshop_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    customerUserId: text("customer_user_id").notNull(),
    name: text("name").notNull().default("Wishlist"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("webshop_wishlists_customer_unique").on(
      table.webshopId,
      table.customerUserId,
    ),
    index("webshop_wishlists_webshop_idx").on(table.webshopId),
    index("webshop_wishlists_customer_idx").on(table.customerUserId),
  ],
);

export const webshopWishlistItems = pgTable(
  "webshop_wishlist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    wishlistId: uuid("wishlist_id")
      .notNull()
      .references(() => webshopWishlists.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => webshopProducts.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => webshopProductVariants.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("webshop_wishlist_items_product_unique")
      .on(table.wishlistId, table.productId)
      .where(sql`${table.variantId} IS NULL`),
    uniqueIndex("webshop_wishlist_items_variant_unique")
      .on(table.wishlistId, table.productId, table.variantId)
      .where(sql`${table.variantId} IS NOT NULL`),
    index("webshop_wishlist_items_wishlist_idx").on(table.wishlistId),
    index("webshop_wishlist_items_product_idx").on(table.productId),
    index("webshop_wishlist_items_variant_idx").on(table.variantId),
  ],
);

export const webshopRelatedProducts = pgTable(
  "webshop_related_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    webshopId: uuid("webshop_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => webshopProducts.id, { onDelete: "cascade" }),
    relatedProductId: uuid("related_product_id")
      .notNull()
      .references(() => webshopProducts.id, { onDelete: "cascade" }),
    relationshipType: text("relationship_type").notNull().default("related"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "webshop_related_products_type_check",
      sql`${table.relationshipType} IN ('related','upsell','cross_sell','replacement','accessory')`,
    ),
    check(
      "webshop_related_products_position_check",
      sql`${table.position} >= 0`,
    ),
    check(
      "webshop_related_products_self_check",
      sql`${table.productId} <> ${table.relatedProductId}`,
    ),
    uniqueIndex("webshop_related_products_unique").on(
      table.webshopId,
      table.productId,
      table.relatedProductId,
      table.relationshipType,
    ),
    index("webshop_related_products_product_type_idx").on(
      table.productId,
      table.relationshipType,
      table.position,
    ),
    index("webshop_related_products_related_idx").on(table.relatedProductId),
    index("webshop_related_products_webshop_idx").on(table.webshopId),
  ],
);

export const webshopProductReviews = pgTable(
  "webshop_product_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => webshopProducts.id, { onDelete: "cascade" }),
    customerUserId: text("customer_user_id").notNull(),
    orderId: uuid("order_id").references(() => webshopOrders.id, {
      onDelete: "set null",
    }),
    orderItemId: uuid("order_item_id").references(() => webshopOrderItems.id, {
      onDelete: "set null",
    }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    showCustomerName: boolean("show_customer_name").notNull().default(false),
    customerDisplayNameSnapshot: text("customer_display_name_snapshot"),
    status: text("status").notNull().default("pending"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    moderatedBy: text("moderated_by"),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("webshop_product_reviews_customer_unique").on(
      table.productId,
      table.customerUserId,
    ),
    check(
      "webshop_product_reviews_rating_check",
      sql`${table.rating} BETWEEN 1 AND 5`,
    ),
    check(
      "webshop_product_reviews_status_check",
      sql`${table.status} IN ('pending','published')`,
    ),
    check(
      "webshop_product_reviews_comment_length_check",
      sql`${table.comment} IS NULL OR char_length(${table.comment}) BETWEEN 1 AND 5000`,
    ),
    index("webshop_product_reviews_product_status_created_idx").on(
      table.productId,
      table.status,
      table.createdAt,
    ),
    index("webshop_product_reviews_customer_idx").on(table.customerUserId),
    index("webshop_product_reviews_order_idx").on(
      table.orderId,
      table.orderItemId,
    ),
    index("webshop_product_reviews_ip_hash_idx").on(table.ipHash),
  ],
);

export const webshopAuditEvents = pgTable(
  "webshop_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id"),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    action: text("action").notNull(),
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("webshop_audit_events_actor_idx").on(table.actorId),
    index("webshop_audit_events_action_idx").on(table.action),
    index("webshop_audit_events_created_idx").on(table.createdAt),
    index("webshop_audit_events_entity_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
  ],
);

export const webshopProductAttributeValues = pgTable(
  "webshop_product_attribute_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => webshopProducts.id, { onDelete: "cascade" }),
    attributeId: uuid("attribute_id")
      .notNull()
      .references(() => webshopAttributes.id, { onDelete: "restrict" }),
    valueText: text("value_text"),
    valueNumber: bigint("value_number", { mode: "number" }),
    valueBoolean: boolean("value_boolean"),
    valueDate: date("value_date"),
    valueJson: jsonb("value_json"),
    optionId: text("option_id"),
  },
  (table) => [
    unique("webshop_product_attribute_values_unique")
      .on(table.productId, table.attributeId, table.optionId)
      .nullsNotDistinct(),
    index("webshop_product_attribute_values_product_idx").on(table.productId),
    index("webshop_product_attribute_values_attribute_idx").on(
      table.attributeId,
    ),
  ],
);

export const webshopProductVariantAttributeValues = pgTable(
  "webshop_product_variant_attribute_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => webshopProductVariants.id, { onDelete: "cascade" }),
    attributeId: uuid("attribute_id")
      .notNull()
      .references(() => webshopAttributes.id, { onDelete: "restrict" }),
    valueText: text("value_text"),
    valueNumber: bigint("value_number", { mode: "number" }),
    valueBoolean: boolean("value_boolean"),
    valueDate: date("value_date"),
    valueJson: jsonb("value_json"),
    optionId: text("option_id"),
  },
  (table) => [
    unique("webshop_product_variant_attribute_values_unique")
      .on(table.variantId, table.attributeId, table.optionId)
      .nullsNotDistinct(),
    index("webshop_product_variant_attribute_values_variant_idx").on(
      table.variantId,
    ),
    index("webshop_product_variant_attribute_values_attribute_idx").on(
      table.attributeId,
    ),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => comments.id, {
      onDelete: "cascade",
    }),
    authorId: text("author_id"),
    authorName: text("author_name").notNull(),
    authorEmail: text("author_email"),
    body: text("body").notNull(),
    status: text("status").notNull().default("pending"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "comments_status_check",
      sql`${table.status} IN ('pending','published')`,
    ),
    check(
      "comments_body_length_check",
      sql`char_length(${table.body}) BETWEEN 1 AND 5000`,
    ),
    index("comments_post_status_created_idx").on(
      table.contentId,
      table.status,
      table.createdAt,
    ),
    index("comments_parent_id_idx").on(table.parentId),
    index("comments_author_id_idx").on(table.authorId),
    index("comments_ip_hash_idx").on(table.ipHash),
  ],
);

// ─── Form Builder ─────────────────────────────────────────────────────────────

export const forms = pgTable(
  "forms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    status: text("status").notNull().default("draft"),
    submitLabel: text("submit_label").notNull().default("Submit"),
    successMessage: text("success_message")
      .notNull()
      .default("Thank you. Your submission has been received."),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    check("forms_status_check", sql`${table.status} IN ('draft','published')`),
    index("forms_status_idx").on(table.status),
    index("forms_created_by_idx").on(table.createdBy),
  ],
);

export const formFields = pgTable(
  "form_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    fieldKey: text("field_key").notNull(),
    fieldType: text("field_type").notNull(),
    label: text("label").notNull(),
    placeholder: text("placeholder"),
    helpText: text("help_text"),
    required: boolean("required").notNull().default(false),
    position: integer("position").notNull(),
    options: jsonb("options"),
    validation: jsonb("validation"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "form_fields_type_check",
      sql`${table.fieldType} IN ('text','textarea','email','number','phone','select','radio','checkbox','date','file')`,
    ),
    unique("form_fields_form_key_unique").on(table.formId, table.fieldKey),
    index("form_fields_form_position_idx").on(table.formId, table.position),
  ],
);

export const formSettings = pgTable("form_settings", {
  formId: uuid("form_id")
    .primaryKey()
    .references(() => forms.id, { onDelete: "cascade" }),
  enableEmailNotifications: boolean("enable_email_notifications")
    .notNull()
    .default(false),
  notificationRecipients: jsonb("notification_recipients")
    .notNull()
    .default(sql`'[]'::jsonb`),
  notificationSubject: text("notification_subject")
    .notNull()
    .default("New submission for {{form_name}}"),
  replyToField: text("reply_to_field"),
  emailTemplate: text("email_template").notNull().default(""),
  redirectUrl: text("redirect_url"),
  enableTurnstile: boolean("enable_turnstile").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const formSubmissions = pgTable(
  "form_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    data: jsonb("data").notNull(),
    status: text("status").notNull().default("new"),
    emailStatus: text("email_status").notNull().default("not_sent"),
    emailError: text("email_error"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    referer: text("referer"),
    submittedBy: text("submitted_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "form_submissions_status_check",
      sql`${table.status} IN ('new','read','spam')`,
    ),
    check(
      "form_submissions_email_status_check",
      sql`${table.emailStatus} IN ('not_sent','sent','failed','skipped')`,
    ),
    index("form_submissions_form_created_idx").on(
      table.formId,
      table.createdAt,
    ),
    index("form_submissions_form_status_idx").on(table.formId, table.status),
    index("form_submissions_ip_hash_idx").on(table.ipHash, table.createdAt),
  ],
);

// ─── Global Settings (singleton) ──────────────────────────────────────────────

export const globalSettings = pgTable(
  "global_settings",
  {
    id: integer("id").primaryKey(),
    siteName: text("site_name").notNull().default("Night Raven CMS"),
    publicSiteUrl: text("public_site_url"),
    defaultLanguage: text("default_language").notNull().default("en-US"),
    timezone: text("timezone").notNull().default("UTC"),
    siteLogoFileId: uuid("site_logo_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    headerContent: text("header_content"),
    headerSettings: jsonb("header_settings")
      .notNull()
      .default(sql`'{}'::jsonb`),
    footerContent: text("footer_content"),
    footerSettings: jsonb("footer_settings")
      .notNull()
      .default(sql`'{}'::jsonb`),
    stickyHeaderHeight: integer("sticky_header_height").notNull().default(80),
    stickyFooterHeight: integer("sticky_footer_height").notNull().default(110),
    maxUploadSizeBytes: bigint("max_upload_size_bytes", { mode: "number" })
      .notNull()
      .default(52_428_800),
    maxBatchUploadSizeBytes: bigint("max_batch_upload_size_bytes", {
      mode: "number",
    })
      .notNull()
      .default(524_288_000),
    // ─── Appearance (driven by lib/appearance.ts) ──────────────────────────
    theme: text("theme").notNull().default("default"),
    frontendContentWidth: text("frontend_content_width")
      .notNull()
      .default("contained"),
    backendContentWidth: text("backend_content_width")
      .notNull()
      .default("contained"),
    fontPreset: text("font_preset").notNull().default("system"),
    radiusPreset: text("radius_preset").notNull().default("medium"),
    shadowPreset: text("shadow_preset").notNull().default("soft"),
    appearanceRecipe: jsonb("appearance_recipe")
      .notNull()
      .default(sql`'{}'::jsonb`),
    // ─── AI writing assistant ─────────────────────────────────────────────
    openaiApiKey: text("openai_api_key"),
    aiWritingAssistantEnabled: boolean("ai_writing_assistant_enabled")
      .notNull()
      .default(false),
    aiPageBuilderAssistantEnabled: boolean("ai_page_builder_assistant_enabled")
      .notNull()
      .default(false),
    aiWebshopAssistantEnabled: boolean("ai_webshop_assistant_enabled")
      .notNull()
      .default(false),
    aiDefaultProvider: text("ai_default_provider").notNull().default("openai"),
    aiProviderSettings: jsonb("ai_provider_settings")
      .notNull()
      .default(sql`'{}'::jsonb`),
    aiWritingAssistantModel: text("ai_writing_assistant_model")
      .notNull()
      .default("gpt-4.1-mini"),
    aiWritingAssistantMaxOutputTokens: integer(
      "ai_writing_assistant_max_output_tokens",
    )
      .notNull()
      .default(48),
    aiWritingAssistantInstructions: text("ai_writing_assistant_instructions"),
    // ─── Content history ───────────────────────────────────────────────────
    contentHistoryEnabled: boolean("content_history_enabled")
      .notNull()
      .default(true),
    // ─── Session security (driven by lib/session-security.ts) ──────────────
    maxSessionDurationMinutes: integer("max_session_duration_minutes")
      .notNull()
      .default(480),
    idleLogoutMinutes: integer("idle_logout_minutes").notNull().default(30),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    updatedBy: text("updated_by"),
  },
  (table) => [
    check("global_settings_singleton_check", sql`${table.id} = 1`),
    check(
      "global_settings_sticky_header_check",
      sql`${table.stickyHeaderHeight} BETWEEN 0 AND 400`,
    ),
    check(
      "global_settings_sticky_footer_check",
      sql`${table.stickyFooterHeight} BETWEEN 0 AND 400`,
    ),
    check(
      "global_settings_max_upload_check",
      sql`${table.maxUploadSizeBytes} > 0`,
    ),
    check(
      "global_settings_max_batch_check",
      sql`${table.maxBatchUploadSizeBytes} >= ${table.maxUploadSizeBytes}`,
    ),
    check(
      "global_settings_default_language_check",
      sql`${table.defaultLanguage} IN ('en-US','en-GB','en-CA','en-AU','en-IN','sr-RS','sr-Cyrl-RS','sr-Latn-RS','de-DE','de-AT','de-CH','fr-FR','fr-CA','fr-CH','es-ES','es-MX','es-AR','es-CO','es-CL','it-IT','pt-BR','pt-PT','nl-NL','nl-BE','sv-SE','da-DK','nb-NO','fi-FI','pl-PL','cs-CZ','sk-SK','hu-HU','ro-RO','bg-BG','el-GR','hr-HR','bs-BA','sl-SI','mk-MK','sq-AL','tr-TR','ru-RU','uk-UA','ar-SA','he-IL','hi-IN','bn-BD','ur-PK','fa-IR','zh-CN','zh-TW','ja-JP','ko-KR','th-TH','vi-VN','id-ID','ms-MY')`,
    ),
    check(
      "global_settings_timezone_check",
      sql`${table.timezone} IN ('UTC','Africa/Cairo','Africa/Casablanca','Africa/Johannesburg','Africa/Lagos','Africa/Nairobi','America/Anchorage','America/Argentina/Buenos_Aires','America/Bogota','America/Caracas','America/Chicago','America/Denver','America/Detroit','America/Edmonton','America/Halifax','America/Lima','America/Los_Angeles','America/Mexico_City','America/Montevideo','America/New_York','America/Phoenix','America/Santiago','America/Sao_Paulo','America/St_Johns','America/Toronto','America/Vancouver','Asia/Almaty','Asia/Amman','Asia/Bahrain','Asia/Baku','Asia/Bangkok','Asia/Beirut','Asia/Dhaka','Asia/Dubai','Asia/Hong_Kong','Asia/Jakarta','Asia/Jerusalem','Asia/Karachi','Asia/Kathmandu','Asia/Kolkata','Asia/Kuala_Lumpur','Asia/Kuwait','Asia/Manila','Asia/Muscat','Asia/Qatar','Asia/Riyadh','Asia/Seoul','Asia/Shanghai','Asia/Singapore','Asia/Taipei','Asia/Tbilisi','Asia/Tehran','Asia/Tokyo','Asia/Yerevan','Australia/Adelaide','Australia/Brisbane','Australia/Melbourne','Australia/Perth','Australia/Sydney','Europe/Amsterdam','Europe/Andorra','Europe/Athens','Europe/Belgrade','Europe/Berlin','Europe/Bratislava','Europe/Brussels','Europe/Bucharest','Europe/Budapest','Europe/Chisinau','Europe/Copenhagen','Europe/Dublin','Europe/Helsinki','Europe/Istanbul','Europe/Kyiv','Europe/Lisbon','Europe/Ljubljana','Europe/London','Europe/Luxembourg','Europe/Madrid','Europe/Malta','Europe/Monaco','Europe/Oslo','Europe/Paris','Europe/Podgorica','Europe/Prague','Europe/Riga','Europe/Rome','Europe/Sarajevo','Europe/Skopje','Europe/Sofia','Europe/Stockholm','Europe/Tallinn','Europe/Tirane','Europe/Vienna','Europe/Vilnius','Europe/Warsaw','Europe/Zurich','Europe/Zagreb','Pacific/Auckland','Pacific/Fiji','Pacific/Honolulu')`,
    ),
    // ─── Appearance enum CHECKs — MUST mirror the arrays in lib/appearance.ts ─
    check(
      "global_settings_theme_check",
      sql`${table.theme} IN ('default','dark','minimal','corporate','cyberpunk','elegant','forest','ocean','sunset','pastel','luxury','obsidian','midnight','aurora','nordic','graphite','paper','sage','terracotta','lavender','monochrome','terminal','rose','high-contrast')`,
    ),
    check(
      "global_settings_frontend_content_width_check",
      sql`${table.frontendContentWidth} ~ '^(full-width|contained|narrow|wide|ultra-wide|[1-9][0-9]{0,4})$'`,
    ),
    check(
      "global_settings_backend_content_width_check",
      sql`${table.backendContentWidth} ~ '^(full-width|contained|narrow|wide|ultra-wide|[1-9][0-9]{0,4})$'`,
    ),
    check(
      "global_settings_font_preset_check",
      sql`${table.fontPreset} IN ('system','sans','serif','mono','display','humanist')`,
    ),
    check(
      "global_settings_radius_preset_check",
      sql`${table.radiusPreset} IN ('none','small','medium','large','rounded')`,
    ),
    check(
      "global_settings_shadow_preset_check",
      sql`${table.shadowPreset} IN ('none','soft','medium','strong')`,
    ),
    check(
      "global_settings_ai_default_provider_check",
      sql`${table.aiDefaultProvider} IN ('openai','anthropic','google','mistral','xai')`,
    ),
    check(
      "global_settings_ai_writing_assistant_max_output_tokens_check",
      sql`${table.aiWritingAssistantMaxOutputTokens} BETWEEN 8 AND 160`,
    ),
    // ─── Session security CHECKs — MUST mirror SessionSecuritySchema ───────
    check(
      "global_settings_max_session_range",
      sql`${table.maxSessionDurationMinutes} BETWEEN 5 AND 10080`,
    ),
    check("global_settings_idle_range", sql`${table.idleLogoutMinutes} >= 1`),
    check(
      "global_settings_idle_le_max",
      sql`${table.idleLogoutMinutes} <= ${table.maxSessionDurationMinutes}`,
    ),
  ],
);

// ─── Content edit locks ─────────────────────────────────────────────────────
// See .github/instructions/cms-content-edit-locking.instructions.md
export const contentEditLocks = pgTable(
  "content_edit_locks",
  {
    contentId: uuid("content_id")
      .primaryKey()
      .references(() => content.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    userDisplayName: text("user_display_name").notNull(),
    userRole: text("user_role").notNull(),
    sessionId: text("session_id").notNull(),
    clientId: text("client_id").notNull(),
    acquiredAt: timestamp("acquired_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    leaseExpiresAt: timestamp("lease_expires_at", {
      withTimezone: true,
    }).notNull(),
    takenOverBy: text("taken_over_by"),
  },
  (table) => [
    index("content_edit_locks_user_id_idx").on(table.userId),
    index("content_edit_locks_lease_expires_at_idx").on(table.leaseExpiresAt),
  ],
);

export const contentEditLockAudit = pgTable(
  "content_edit_lock_audit",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    contentId: uuid("content_id").notNull(),
    userId: text("user_id").notNull(),
    event: text("event").notNull(),
    previousUserId: text("previous_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    metadata: jsonb("metadata"),
  },
  (table) => [
    index("content_edit_lock_audit_content_id_idx").on(table.contentId),
    index("content_edit_lock_audit_created_at_idx").on(table.createdAt),
    check(
      "content_edit_lock_audit_event_check",
      sql`${table.event} IN ('acquired','refreshed','released','expired','force_taken','save_rejected_stale')`,
    ),
  ],
);

// ─── Form edit locks ────────────────────────────────────────────────────────
// Form Builder forms are admin-only, so this mirrors admin section locking:
// one active short-lived lease per form, without takeover between admins.
// See .github/instructions/cms-content-edit-locking.instructions.md
export const formEditLocks = pgTable(
  "form_edit_locks",
  {
    formId: uuid("form_id")
      .primaryKey()
      .references(() => forms.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    userDisplayName: text("user_display_name").notNull(),
    userRole: text("user_role").notNull(),
    sessionId: text("session_id").notNull(),
    clientId: text("client_id").notNull(),
    acquiredAt: timestamp("acquired_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    leaseExpiresAt: timestamp("lease_expires_at", {
      withTimezone: true,
    }).notNull(),
  },
  (table) => [
    index("form_edit_locks_user_id_idx").on(table.userId),
    index("form_edit_locks_lease_expires_at_idx").on(table.leaseExpiresAt),
  ],
);

export const formEditLockAudit = pgTable(
  "form_edit_lock_audit",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    formId: uuid("form_id").notNull(),
    userId: text("user_id").notNull(),
    event: text("event").notNull(),
    previousUserId: text("previous_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    metadata: jsonb("metadata"),
  },
  (table) => [
    index("form_edit_lock_audit_form_id_idx").on(table.formId),
    index("form_edit_lock_audit_created_at_idx").on(table.createdAt),
    check(
      "form_edit_lock_audit_event_check",
      sql`${table.event} IN ('acquired','refreshed','released','expired','save_rejected_stale')`,
    ),
  ],
);

// ─── Admin section edit locks ──────────────────────────────────────────────
// Same collaborative edit-locking pattern as `content_edit_locks`, but keyed
// by a string `section_key` so it can be applied to admin singleton pages
// (e.g. `global-settings`, `top-menu`) that are not row-scoped.
// See .github/instructions/cms-content-edit-locking.instructions.md
export const adminSectionLocks = pgTable(
  "admin_section_locks",
  {
    sectionKey: text("section_key").primaryKey(),
    userId: text("user_id").notNull(),
    userDisplayName: text("user_display_name").notNull(),
    userRole: text("user_role").notNull(),
    sessionId: text("session_id").notNull(),
    clientId: text("client_id").notNull(),
    acquiredAt: timestamp("acquired_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    leaseExpiresAt: timestamp("lease_expires_at", {
      withTimezone: true,
    }).notNull(),
    takenOverBy: text("taken_over_by"),
  },
  (table) => [
    index("admin_section_locks_user_id_idx").on(table.userId),
    index("admin_section_locks_lease_expires_at_idx").on(table.leaseExpiresAt),
  ],
);

export const adminSectionLockAudit = pgTable(
  "admin_section_lock_audit",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    sectionKey: text("section_key").notNull(),
    userId: text("user_id").notNull(),
    event: text("event").notNull(),
    previousUserId: text("previous_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    metadata: jsonb("metadata"),
  },
  (table) => [
    index("admin_section_lock_audit_section_key_idx").on(table.sectionKey),
    index("admin_section_lock_audit_created_at_idx").on(table.createdAt),
    check(
      "admin_section_lock_audit_event_check",
      sql`${table.event} IN ('acquired','refreshed','released','expired','force_taken','save_rejected_stale')`,
    ),
  ],
);
