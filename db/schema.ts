// Rebuilt through bounded apply-patch segments; do not edit this marker.
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
    signedEntitlement: text("signed_entitlement"),
    signingKid: text("signing_kid"),
    verifiedClaims: jsonb("verified_claims").notNull().default(sql`'{}'::jsonb`),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    lastRevalidationAttemptAt: timestamp("last_revalidation_attempt_at", { withTimezone: true }),
    lastRevalidationSuccessAt: timestamp("last_revalidation_success_at", { withTimezone: true }),
    nextRevalidationAt: timestamp("next_revalidation_at", { withTimezone: true }),
    graceEndsAt: timestamp("grace_ends_at", { withTimezone: true }),
    lastCentralStatus: text("last_central_status"),
    lastErrorCode: text("last_error_code"),
    lifecycleVersion: bigint("lifecycle_version", { mode: "number" }).notNull().default(0),
    releaseId: uuid("release_id"),
    licenseEnvironment: text("license_environment").notNull().default("development"),
    licenseValidUntil: timestamp("license_valid_until", { withTimezone: true }),
    entitlementEnvelopeExpiresAt: timestamp("entitlement_envelope_expires_at", { withTimezone: true }),
    entitlementSnapshotHash: text("entitlement_snapshot_hash"),
    installationId: uuid("installation_id"),
    installationKeyFingerprint: text("installation_key_fingerprint"),
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
      sql`${table.status} IN ('license_required','ready','expired','invalid','install_pending','lifecycle_finalization_pending','deactivated','transferred')`,
    ),
    check(
      "webshop_addon_entitlements_provider_check",
      sql`${table.provider} IS NULL OR ${table.provider} IN ('vercel','self_hosted')`,
    ),
    check(
      "webshop_addon_entitlements_environment_check",
      sql`${table.deploymentEnvironment} IS NULL OR ${table.deploymentEnvironment} IN ('production','self_hosted')`,
    ),
    check(
      "webshop_addon_entitlements_license_environment_check",
      sql`${table.licenseEnvironment} IN ('development','staging','production')`,
    ),
    check(
      "webshop_addon_entitlements_v2_managed_state_check",
      sql`${table.status} NOT IN ('ready','install_pending') OR (${table.signedEntitlement} IS NOT NULL AND ${table.entitlementEnvelopeExpiresAt} IS NOT NULL AND ${table.nextRevalidationAt} IS NOT NULL AND ${table.entitlementSnapshotHash} ~ '^sha256:[a-f0-9]{64}$')`,
    ),
  ],
);

export const licenseServerAddonEntitlements = pgTable(
  "license_server_addon_entitlements",
  {
    id: integer("id").primaryKey().default(1),
    status: text("status").notNull().default("license_required"),
    licenseKeyRef: text("license_key_ref"),
    entitlementToken: text("entitlement_token"),
    signedEntitlement: text("signed_entitlement"),
    signingKid: text("signing_kid"),
    verifiedClaims: jsonb("verified_claims").notNull().default(sql`'{}'::jsonb`),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    lastRevalidationAttemptAt: timestamp("last_revalidation_attempt_at", { withTimezone: true }),
    lastRevalidationSuccessAt: timestamp("last_revalidation_success_at", { withTimezone: true }),
    nextRevalidationAt: timestamp("next_revalidation_at", { withTimezone: true }),
    graceEndsAt: timestamp("grace_ends_at", { withTimezone: true }),
    lastCentralStatus: text("last_central_status"),
    lastErrorCode: text("last_error_code"),
    lifecycleVersion: bigint("lifecycle_version", { mode: "number" }).notNull().default(0),
    installationId: uuid("installation_id"),
    installationKeyFingerprint: text("installation_key_fingerprint"),
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
    check(
      "license_server_addon_entitlements_singleton_check",
      sql`${table.id} = 1`,
    ),
    check(
      "license_server_addon_entitlements_status_check",
      sql`${table.status} IN ('license_required','ready','expired','invalid','install_pending')`,
    ),
    check(
      "license_server_addon_entitlements_provider_check",
      sql`${table.provider} IS NULL OR ${table.provider} IN ('vercel','self_hosted')`,
    ),
    check(
      "license_server_addon_entitlements_environment_check",
      sql`${table.deploymentEnvironment} IS NULL OR ${table.deploymentEnvironment} IN ('production','self_hosted')`,
    ),
  ],
);

export const vendorAddonInstallationIdentities = pgTable(
  "vendor_addon_installation_identities",
  {
    id: integer("id").primaryKey().default(1),
    installationId: uuid("installation_id").notNull(),
    installationKeyId: text("installation_key_id").notNull(),
    installationPublicKey: text("installation_public_key").notNull(),
    installationPrivateKeyEncrypted: text("installation_private_key_encrypted").notNull(),
    installationKeyFingerprint: text("installation_key_fingerprint").notNull(),
    installationFingerprintScheme: text("installation_fingerprint_scheme")
      .notNull()
      .default("legacy_pem_utf8_sha256_v0"),
    privateKeyEnvelopeKid: text("private_key_envelope_kid"),
    keyVersion: integer("key_version").notNull().default(1),
    deploymentMode: text("deployment_mode").notNull(),
    canonicalDomain: text("canonical_domain").notNull(),
    stagingDomains: jsonb("staging_domains").notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    check("vendor_addon_installation_identities_singleton_check", sql`${table.id} = 1`),
    unique("vendor_addon_installation_identities_installation_id_unique").on(table.installationId),
    unique("vendor_addon_installation_identities_key_id_unique").on(table.installationKeyId),
    check(
      "vendor_addon_installation_identities_fingerprint_scheme_check",
      sql`${table.installationFingerprintScheme} IN ('legacy_pem_utf8_sha256_v0','ed25519_spki_der_sha256_v1')`,
    ),
  ],
);

/**
 * Short-lived, server-only material used to answer the master HTTPS
 * well-known domain-control fetch while a Webshop purchase challenge is being
 * completed. It deliberately never stores the resulting purchase JWS.
 */
export const webshopPurchaseIntentDomainProofs = pgTable(
  "webshop_purchase_intent_domain_proofs",
  {
    challengeId: uuid("challenge_id").primaryKey(),
    canonicalDomain: text("canonical_domain").notNull(),
    installationId: uuid("installation_id").notNull(),
    installationKeyFingerprint: text("installation_key_fingerprint").notNull(),
    installationFingerprintScheme: text("installation_fingerprint_scheme").notNull(),
    proofPayload: text("proof_payload").notNull(),
    proofSignature: text("proof_signature").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("webshop_purchase_intent_domain_proofs_expiry_idx").on(
      table.expiresAt,
    ),
    check(
      "webshop_purchase_intent_domain_proofs_fingerprint_scheme_check",
      sql`${table.installationFingerprintScheme} = 'ed25519_spki_der_sha256_v1'`,
    ),
  ],
);

export const cmsAddonInstallations = pgTable(
  "cms_addon_installations",
  {
    addonKey: text("addon_key").primaryKey(),
    installationId: uuid("installation_id").notNull(),
    desiredPackageName: text("desired_package_name").notNull(),
    desiredPackageVersion: text("desired_package_version").notNull(),
    desiredArtifactSha256: text("desired_artifact_sha256").notNull(),
    desiredReleaseId: uuid("desired_release_id"),
    licenseEnvironment: text("license_environment").notNull().default("development"),
    desiredDependencyLockSha256: text("desired_dependency_lock_sha256"),
    desiredNpmTarballSha256: text("desired_npm_tarball_sha256"),
    desiredNpmTarballIntegrity: text("desired_npm_tarball_integrity"),
    desiredEmbeddedManifestSha256: text("desired_embedded_manifest_sha256"),
    desiredProvenanceSha256: text("desired_provenance_sha256"),
    desiredSbomSha256: text("desired_sbom_sha256"),
    desiredPublicationAttestationHash: text("desired_publication_attestation_hash"),
    desiredRegistryPackageVersionId: text("desired_registry_package_version_id"),
    desiredSourceReleasedAt: timestamp("desired_source_released_at", { withTimezone: true }),
    desiredPublishedAt: timestamp("desired_published_at", { withTimezone: true }),
    desiredReleaseSigningKid: text("desired_release_signing_kid"),
    desiredRuntimeContractVersion: text("desired_runtime_contract_version"),
    desiredCmsVersionRange: text("desired_cms_version_range"),
    desiredNodeVersionRange: text("desired_node_version_range"),
    desiredNextVersionRange: text("desired_next_version_range"),
    desiredMinimumCoreSchemaVersion: integer("desired_minimum_core_schema_version"),
    desiredSchemaVersion: integer("desired_schema_version"),
    desiredSupportedAddonSchemaVersionMin: integer("desired_supported_addon_schema_version_min"),
    desiredSupportedAddonSchemaVersionMax: integer("desired_supported_addon_schema_version_max"),
    desiredMigrationBundleHash: text("desired_migration_bundle_hash"),
    desiredSupportedLicenseEditions: jsonb("desired_supported_license_editions"),
    desiredReleaseChannel: text("desired_release_channel"),
    desiredHostCapabilityDescriptorHash: text("desired_host_capability_descriptor_hash"),
    installationDeploymentEpoch: bigint("installation_deployment_epoch", { mode: "number" }).notNull().default(0),
    entitlementSnapshotHash: text("entitlement_snapshot_hash"),
    entitlementLifecycleVersion: bigint("entitlement_lifecycle_version", { mode: "number" }).notNull().default(0),
    entitlementEnvelopeExpiresAt: timestamp("entitlement_envelope_expires_at", { withTimezone: true }),
    installedPackageName: text("installed_package_name"),
    installedPackageVersion: text("installed_package_version"),
    installedArtifactSha256: text("installed_artifact_sha256"),
    installedReleaseId: uuid("installed_release_id"),
    installedDependencyLockSha256: text("installed_dependency_lock_sha256"),
    installedNpmTarballSha256: text("installed_npm_tarball_sha256"),
    installedNpmTarballIntegrity: text("installed_npm_tarball_integrity"),
    installedEmbeddedManifestSha256: text("installed_embedded_manifest_sha256"),
    installedProvenanceSha256: text("installed_provenance_sha256"),
    installedSbomSha256: text("installed_sbom_sha256"),
    installedPublicationAttestationHash: text("installed_publication_attestation_hash"),
    installedRegistryPackageVersionId: text("installed_registry_package_version_id"),
    installedSourceReleasedAt: timestamp("installed_source_released_at", { withTimezone: true }),
    installedPublishedAt: timestamp("installed_published_at", { withTimezone: true }),
    installedReleaseSigningKid: text("installed_release_signing_kid"),
    installedRuntimeContractVersion: text("installed_runtime_contract_version"),
    installedCmsVersionRange: text("installed_cms_version_range"),
    installedNodeVersionRange: text("installed_node_version_range"),
    installedNextVersionRange: text("installed_next_version_range"),
    installedMinimumCoreSchemaVersion: integer("installed_minimum_core_schema_version"),
    installedSchemaVersion: integer("installed_schema_version"),
    installedSupportedAddonSchemaVersionMin: integer("installed_supported_addon_schema_version_min"),
    installedSupportedAddonSchemaVersionMax: integer("installed_supported_addon_schema_version_max"),
    installedMigrationBundleHash: text("installed_migration_bundle_hash"),
    installedMigrationLedgerHash: text("installed_migration_ledger_hash"),
    installedSupportedLicenseEditions: jsonb("installed_supported_license_editions"),
    installedReleaseChannel: text("installed_release_channel"),
    installedHostCapabilityDescriptorHash: text("installed_host_capability_descriptor_hash"),
    installedBuildId: text("installed_build_id"),
    runtimeContractVersion: text("runtime_contract_version"),
    schemaVersion: integer("schema_version"),
    runtimeStatus: text("runtime_status").notNull().default("not_installed"),
    status: text("status").notNull().default("license_accepted"),
    deploymentJobId: text("deployment_job_id"),
    installAttemptCount: integer("install_attempt_count").notNull().default(0),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    deployedAt: timestamp("deployed_at", { withTimezone: true }),
    reconciledAt: timestamp("reconciled_at", { withTimezone: true }),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    version: integer("version").notNull().default(0),
  },
  (table) => [
    check("cms_addon_installations_status_check", sql`${table.status} IN ('license_accepted','install_pending','installed','migration_pending','ready','failed','disabled','update_pending')`),
    check("cms_addon_installations_key_check", sql`${table.addonKey} IN ('webshop','license-server')`),
    check("cms_addon_installations_license_environment_check", sql`${table.licenseEnvironment} IN ('development','staging','production')`),
    check("cms_addon_installations_runtime_status_check", sql`${table.runtimeStatus} IN ('not_installed','ready','maintenance','unavailable')`),
    check("cms_addon_installations_desired_runtime_contract_check", sql`${table.desiredRuntimeContractVersion} IS NULL OR ${table.desiredRuntimeContractVersion} = '1'`),
  ],
);

export const cmsAddonMigrations = pgTable("cms_addon_migrations", {
  addonKey: text("addon_key").notNull(),
  migrationId: text("migration_id").notNull(),
  releaseId: uuid("release_id"),
  checksum: text("checksum").notNull(),
  packageVersion: text("package_version").notNull(),
  schemaVersion: integer("schema_version").notNull(),
  status: text("status").notNull().default("pending"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  durationMs: integer("duration_ms"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
}, (table) => [primaryKey({ name: "cms_addon_migrations_pk", columns: [table.addonKey, table.migrationId] }), check("cms_addon_migrations_status_check", sql`${table.status} IN ('pending','applying','applied','failed','legacy_applied')`)]);

export const cmsAddonOperations = pgTable("cms_addon_operations", {
  id: uuid("id").primaryKey().defaultRandom(),
  addonKey: text("addon_key").notNull(),
  operationKey: text("operation_key").notNull(),
  deploymentIntentKey: text("deployment_intent_key"),
  installationId: uuid("installation_id"),
  installationDeploymentEpoch: bigint("installation_deployment_epoch", { mode: "number" }),
  generation: integer("generation"),
  supersedesOperationId: uuid("supersedes_operation_id"),
  operationType: text("operation_type").notNull(),
  status: text("status").notNull().default("pending"),
  requestHash: text("request_hash").notNull(),
  result: jsonb("result").notNull().default(sql`'{}'::jsonb`),
  errorCode: text("error_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [unique("cms_addon_operations_key_unique").on(table.addonKey, table.operationKey), unique("cms_addon_operations_intent_generation_unique").on(table.deploymentIntentKey, table.generation), check("cms_addon_operations_status_check", sql`${table.status} IN ('pending','running','completed','failed','superseded')`)]);

export const cmsAddonDeploymentOutbox = pgTable("cms_addon_deployment_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  addonKey: text("addon_key").notNull(),
  installationId: uuid("installation_id").notNull(),
  operationId: uuid("operation_id").notNull().references(() => cmsAddonOperations.id, { onDelete: "restrict" }),
  installationDeploymentEpoch: bigint("installation_deployment_epoch", { mode: "number" }).notNull(),
  deploymentIntentKey: text("deployment_intent_key").notNull(),
  generation: integer("generation").notNull(),
  operationKey: text("operation_key").notNull(),
  requestAuthKid: text("request_auth_kid"),
  targetProfile: text("target_profile").notNull(),
  licenseEnvironment: text("license_environment").notNull(),
  payloadVersion: integer("payload_version").notNull().default(1),
  payload: jsonb("payload").notNull(),
  requestHash: text("request_hash").notNull(),
  status: text("status").notNull().default("pending"),
  attemptCount: integer("attempt_count").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(20),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  leaseToken: uuid("lease_token"),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  workerJobId: text("worker_job_id"),
  lastHttpStatus: integer("last_http_status"),
  lastErrorCode: text("last_error_code"),
  lastErrorMessage: text("last_error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  unique("cms_addon_deployment_outbox_operation_key_unique").on(table.operationKey),
  index("cms_addon_deployment_outbox_dispatch_idx").on(table.status, table.nextAttemptAt),
  check("cms_addon_deployment_outbox_environment_check", sql`${table.licenseEnvironment} IN ('development','staging','production')`),
  check("cms_addon_deployment_outbox_status_check", sql`${table.status} IN ('pending','sending','accepted','retry','completed','failed','superseded','dead_letter')`),
]);

export const cmsAddonEntitlementKeysets = pgTable("cms_addon_entitlement_keysets", {
  purpose: text("purpose").primaryKey(),
  sequence: integer("sequence").notNull(),
  contentSha256: text("content_sha256").notNull(),
  previousKeysetSha256: text("previous_keyset_sha256"),
  keysetBytes: text("keyset_bytes").notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Durable local half of a master-assigned deactivation or source-transfer operation. */
export const cmsAddonLifecycleOperations = pgTable("cms_addon_lifecycle_operations", {
  id: uuid("id").primaryKey(),
  addonKey: text("addon_key").notNull(),
  lifecycleAction: text("lifecycle_action").notNull(),
  receiptRole: text("receipt_role").notNull(),
  state: text("state").notNull().default("lifecycle_finalization_pending"),
  activationId: uuid("activation_id").notNull(),
  entitlementId: uuid("entitlement_id").notNull(),
  installationId: uuid("installation_id").notNull(),
  canonicalDomain: text("canonical_domain").notNull(),
  transferId: uuid("transfer_id"),
  targetInstallationId: uuid("target_installation_id"),
  targetCanonicalDomain: text("target_canonical_domain"),
  preLifecycleVersion: bigint("pre_lifecycle_version", { mode: "number" }).notNull(),
  finalRequestBodyHash: text("final_request_body_hash").notNull(),
  finalRequestBody: jsonb("final_request_body").notNull(),
  masterChallengeId: uuid("master_challenge_id"),
  masterProofPayload: text("master_proof_payload"),
  originalCompleteAcceptUntil: timestamp("original_complete_accept_until", { withTimezone: true }).notNull(),
  resultBodyHash: text("result_body_hash"),
  receiptCompact: text("receipt_compact"),
  receiptJti: uuid("receipt_jti"),
  receiptExpiresAt: timestamp("receipt_expires_at", { withTimezone: true }),
  statusObservationRequestId: uuid("status_observation_request_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("cms_addon_lifecycle_operations_state_idx").on(table.addonKey, table.state, table.createdAt),
  check("cms_addon_lifecycle_operations_action_check", sql`${table.lifecycleAction} IN ('deactivate','transfer_source_complete')`),
  check("cms_addon_lifecycle_operations_role_check", sql`${table.receiptRole} IN ('deactivation','transfer_source','transfer_target')`),
  check("cms_addon_lifecycle_operations_state_check", sql`${table.state} IN ('lifecycle_finalization_pending','committed','not_committed','restricted')`),
  check("cms_addon_lifecycle_operations_result_hash_check", sql`${table.resultBodyHash} IS NULL OR ${table.resultBodyHash} ~ '^sha256:[a-f0-9]{64}$'`),
]);

export const cmsAddonLifecycleReceipts = pgTable("cms_addon_lifecycle_receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  lifecycleOperationId: uuid("lifecycle_operation_id").notNull().references(() => cmsAddonLifecycleOperations.id, { onDelete: "restrict" }),
  receiptRole: text("receipt_role").notNull(),
  jti: uuid("jti").notNull(),
  compactHash: text("compact_hash").notNull(),
  resultBodyHash: text("result_body_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("cms_addon_lifecycle_receipts_operation_role_unique").on(table.lifecycleOperationId, table.receiptRole),
  unique("cms_addon_lifecycle_receipts_jti_unique").on(table.jti),
  check("cms_addon_lifecycle_receipts_role_check", sql`${table.receiptRole} IN ('deactivation','transfer_source','transfer_target')`),
]);

export const cmsAddonWorkerCallbacks = pgTable("cms_addon_worker_callbacks", {
  id: uuid("id").primaryKey().defaultRandom(),
  operationId: uuid("operation_id").notNull().references(() => cmsAddonOperations.id, { onDelete: "restrict" }),
  workerJobId: text("worker_job_id").notNull(),
  payloadHash: text("payload_hash").notNull(),
  status: text("status").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("cms_addon_worker_callbacks_operation_worker_unique").on(table.operationId, table.workerJobId)]);

export const cmsAddonDeploymentResults = pgTable("cms_addon_deployment_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  resultId: uuid("result_id").notNull(),
  operationId: uuid("operation_id").notNull().references(() => cmsAddonOperations.id, { onDelete: "restrict" }),
  workerJobId: text("worker_job_id").notNull(),
  resultBodyHash: text("result_body_hash").notNull(),
  resultStatus: text("result_status").notNull(),
  finalPhase: text("final_phase").notNull(),
  terminalEvidenceKind: text("terminal_evidence_kind").notNull(),
  terminalEvidenceHash: text("terminal_evidence_hash").notNull(),
  receivedPayload: jsonb("received_payload").notNull(),
  initialAck: text("initial_ack").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("cms_addon_deployment_results_result_id_unique").on(table.resultId),
  unique("cms_addon_deployment_results_operation_job_unique").on(table.operationId, table.workerJobId),
  check("cms_addon_deployment_results_initial_ack_check", sql`${table.initialAck} IN ('applied','stale_installation_ignored','stale_epoch_ignored','stale_generation_ignored')`),
  check("cms_addon_deployment_results_terminal_tuple_check", sql`(${table.resultStatus} = 'failed' AND ${table.finalPhase} = 'rejected_before_switch' AND ${table.terminalEvidenceKind} = 'no_mutation_receipt') OR (${table.resultStatus} = 'succeeded' AND ${table.finalPhase} = 'ready' AND ${table.terminalEvidenceKind} = 'reconciliation_receipt') OR (${table.resultStatus} = 'failed' AND ${table.finalPhase} IN ('rolled_back','maintenance_required','rollback_failed') AND ${table.terminalEvidenceKind} = 'recovery_receipt')`),
]);

export const cmsAddonDeploymentCandidates = pgTable("cms_addon_deployment_candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  operationId: uuid("operation_id").notNull().references(() => cmsAddonOperations.id, { onDelete: "restrict" }),
  workerJobId: text("worker_job_id").notNull(),
  installationDeploymentEpoch: bigint("installation_deployment_epoch", { mode: "number" }).notNull(),
  generation: integer("generation").notNull(),
  evidence: jsonb("evidence").notNull(),
  terminalReceiptId: uuid("terminal_receipt_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("cms_addon_deployment_candidates_operation_job_epoch_generation_unique").on(table.operationId, table.workerJobId, table.installationDeploymentEpoch, table.generation)]);

export const cmsAddonServingFences = pgTable("cms_addon_serving_fences", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetProfile: text("target_profile").notNull(), addonKey: text("addon_key").notNull(), installationId: uuid("installation_id").notNull(),
  operationId: uuid("operation_id").notNull().references(() => cmsAddonOperations.id, { onDelete: "restrict" }), workerJobId: text("worker_job_id").notNull(),
  installationDeploymentEpoch: bigint("installation_deployment_epoch", { mode: "number" }).notNull(), generation: integer("generation").notNull(),
  preOperationServingStateHash: text("pre_operation_serving_state_hash").notNull(), preOperationTerminalReceiptId: uuid("pre_operation_terminal_receipt_id"),
  state: text("state").notNull().default("active"), terminalReceiptId: uuid("terminal_receipt_id"), startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(), resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (table) => [
  unique("cms_addon_serving_fences_operation_unique").on(table.operationId),
  unique("cms_addon_serving_fences_tuple_unique").on(table.targetProfile, table.addonKey, table.installationId, table.installationDeploymentEpoch, table.generation),
  check("cms_addon_serving_fences_state_check", sql`${table.state} IN ('active','resolved_success','resolved_recovery','resolved_no_mutation')`),
]);

export const cmsAddonDeploymentTerminalReceipts = pgTable("cms_addon_deployment_terminal_receipts", {
  id: uuid("id").primaryKey().defaultRandom(), operationId: uuid("operation_id").notNull().references(() => cmsAddonOperations.id, { onDelete: "restrict" }), workerJobId: text("worker_job_id").notNull(),
  kind: text("kind").notNull(), evidenceHash: text("evidence_hash").notNull(), finalTuple: jsonb("final_tuple").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("cms_addon_deployment_terminal_receipts_operation_job_unique").on(table.operationId, table.workerJobId),
  check("cms_addon_deployment_terminal_receipts_kind_check", sql`${table.kind} IN ('reconciliation_receipt','recovery_receipt','no_mutation_receipt')`),
]);

export const licenseServerApiClients = pgTable(
  "license_server_api_clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    clientId: text("client_id").notNull(),
    secretEncrypted: text("secret_encrypted").notNull(),
    secretFingerprint: text("secret_fingerprint").notNull(),
    allowedDomains: jsonb("allowed_domains")
      .notNull()
      .default(sql`'[]'::jsonb`),
    status: text("status").notNull().default("active"),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    rotatedAt: timestamp("rotated_at", { withTimezone: true }),
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
    unique("license_server_api_clients_client_id_unique").on(table.clientId),
    check(
      "license_server_api_clients_status_check",
      sql`${table.status} IN ('active','inactive','revoked')`,
    ),
    check(
      "license_server_api_clients_title_length_check",
      sql`char_length(${table.title}) BETWEEN 1 AND 160`,
    ),
    check(
      "license_server_api_clients_client_id_length_check",
      sql`char_length(${table.clientId}) BETWEEN 1 AND 160`,
    ),
    check(
      "license_server_api_clients_fingerprint_length_check",
      sql`char_length(${table.secretFingerprint}) = 64`,
    ),
    index("license_server_api_clients_status_idx").on(
      table.status,
      table.createdAt,
    ),
    index("license_server_api_clients_fingerprint_idx").on(
      table.secretFingerprint,
    ),
  ],
);

export const licenseServerApiClientNonces = pgTable(
  "license_server_api_client_nonces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apiClientId: uuid("api_client_id")
      .notNull()
      .references(() => licenseServerApiClients.id, { onDelete: "cascade" }),
    nonce: text("nonce").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("license_server_api_client_nonces_client_nonce_unique").on(
      table.apiClientId,
      table.nonce,
    ),
    index("license_server_api_client_nonces_created_idx").on(table.createdAt),
  ],
);

/** Exactly one Customer License Issuer exists per CMS installation (single tenant). */
export const customerIssuerIdentities = pgTable(
  "customer_issuer_identity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    singletonKey: text("singleton_key").notNull().default("default"),
    issuerRef: text("issuer_ref").notNull(),
    displayName: text("display_name").notNull().default("Customer License Issuer"),
    keyVersion: integer("key_version").notNull().default(1),
    activeSigningKid: text("active_signing_kid").notNull(),
    publicKeySet: jsonb("public_key_set").notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [unique("customer_issuer_identity_singleton_unique").on(table.singletonKey), unique("customer_issuer_identity_ref_unique").on(table.issuerRef)],
);

export const customerIssuerKeys = pgTable(
  "customer_issuer_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    issuerId: uuid("issuer_id").notNull().references(() => customerIssuerIdentities.id, { onDelete: "cascade" }),
    keyId: text("key_id").notNull(),
    publicKey: text("public_key").notNull(),
    privateKeyEncrypted: text("private_key_encrypted").notNull(),
    status: text("status").notNull().default("active"),
    notBefore: timestamp("not_before", { withTimezone: true }).notNull().defaultNow(),
    signingStopsAt: timestamp("signing_stops_at", { withTimezone: true }),
    verificationStopsAt: timestamp("verification_stops_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [unique("customer_issuer_keys_kid_unique").on(table.keyId), index("customer_issuer_keys_issuer_status_idx").on(table.issuerId, table.status), check("customer_issuer_keys_status_check", sql`${table.status} IN ('prepublished','active','verification_only','retired','revoked')`)],
);

export const customerIssuerApiClientScopes = pgTable(
  "customer_issuer_api_client_scopes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apiClientId: uuid("api_client_id").notNull().references(() => licenseServerApiClients.id, { onDelete: "cascade" }),
    productTypeId: uuid("product_type_id").references(() => licenseServerProductTypes.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    environment: text("environment").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [unique("customer_issuer_api_client_scopes_unique").on(table.apiClientId, table.productTypeId, table.action, table.environment), index("customer_issuer_api_client_scopes_lookup_idx").on(table.apiClientId, table.action, table.environment), check("customer_issuer_api_client_scopes_action_check", sql`${table.action} IN ('catalog','issue','validate','renew','suspend','revoke')`), check("customer_issuer_api_client_scopes_environment_check", sql`${table.environment} IN ('development','staging','production')`)],
);

export const customerIssuerIssueOutbox = pgTable(
  "customer_issuer_issue_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceAddon: text("source_addon").notNull(),
    operationKey: text("operation_key").notNull(),
    productTypeId: uuid("product_type_id").notNull().references(() => licenseServerProductTypes.id, { onDelete: "restrict" }),
    sku: text("sku").notNull(),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    status: text("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(12),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    leaseToken: uuid("lease_token"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    licenseId: uuid("license_id").references(() => licenseServerLicenses.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [unique("customer_issuer_issue_outbox_operation_unique").on(table.sourceAddon, table.operationKey), index("customer_issuer_issue_outbox_status_idx").on(table.status, table.nextAttemptAt), check("customer_issuer_issue_outbox_status_check", sql`${table.status} IN ('pending','processing','completed','failed','dead_letter')`), check("customer_issuer_issue_outbox_attempt_count_check", sql`${table.attemptCount} >= 0 AND ${table.maxAttempts} > 0`)],
);

export const licenseServerProductTypes = pgTable(
  "license_server_product_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    externalRef: text("external_ref"),
    publicKey: text("public_key"),
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{}'::jsonb`),
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
    unique("license_server_product_types_external_ref_unique").on(
      table.externalRef,
    ),
    check(
      "license_server_product_types_status_check",
      sql`${table.status} IN ('active','inactive','archived')`,
    ),
    check(
      "license_server_product_types_title_length_check",
      sql`char_length(${table.title}) BETWEEN 1 AND 160`,
    ),
    check(
      "license_server_product_types_external_ref_length_check",
      sql`${table.externalRef} IS NULL OR char_length(${table.externalRef}) <= 160`,
    ),
    index("license_server_product_types_status_idx").on(
      table.status,
      table.title,
    ),
  ],
);

export const licenseServerProductTypeSkus = pgTable(
  "license_server_product_type_skus",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productTypeId: uuid("product_type_id")
      .notNull()
      .references(() => licenseServerProductTypes.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    durationDays: integer("duration_days").notNull().default(0),
    licenseType: text("license_type").notNull().default("perpetual"),
    policyTemplate: text("policy_template")
      .notNull()
      .default("perpetual_single_device"),
    maxDevices: integer("max_devices"),
    maxDomains: integer("max_domains"),
    maxSeats: integer("max_seats"),
    activationResetLimit: integer("activation_reset_limit"),
    activationResetWindowDays: integer("activation_reset_window_days"),
    validationIntervalSeconds: integer("validation_interval_seconds"),
    offlineGraceSeconds: integer("offline_grace_seconds"),
    features: jsonb("features")
      .notNull()
      .default(sql`'[]'::jsonb`),
    policy: jsonb("policy")
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: text("status").notNull().default("active"),
    keyNamespace: text("key_namespace").notNull(),
    adminNote: text("admin_note"),
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
    unique("license_server_product_type_skus_type_sku_unique").on(
      table.productTypeId,
      table.sku,
    ),
    unique("license_server_product_type_skus_namespace_unique").on(
      table.keyNamespace,
    ),
    check(
      "license_server_product_type_skus_status_check",
      sql`${table.status} IN ('active','inactive','archived')`,
    ),
    check(
      "license_server_product_type_skus_duration_check",
      sql`${table.durationDays} >= 0`,
    ),
    check(
      "license_server_product_type_skus_license_type_check",
      sql`${table.licenseType} IN ('perpetual','subscription','trial','maintenance')`,
    ),
    check(
      "license_server_product_type_skus_policy_template_check",
      sql`${table.policyTemplate} IN ('perpetual_single_device','perpetual_multi_device','domain_license','subscription_device','subscription_domain','trial','seat_based','floating_seat','file_license','maintenance')`,
    ),
    check(
      "license_server_product_type_skus_limits_check",
      sql`(${table.maxDevices} IS NULL OR ${table.maxDevices} >= 0) AND (${table.maxDomains} IS NULL OR ${table.maxDomains} >= 0) AND (${table.maxSeats} IS NULL OR ${table.maxSeats} >= 0)`,
    ),
    check(
      "license_server_product_type_skus_timing_check",
      sql`(${table.activationResetLimit} IS NULL OR ${table.activationResetLimit} >= 0) AND (${table.activationResetWindowDays} IS NULL OR ${table.activationResetWindowDays} >= 0) AND (${table.validationIntervalSeconds} IS NULL OR ${table.validationIntervalSeconds} > 0) AND (${table.offlineGraceSeconds} IS NULL OR ${table.offlineGraceSeconds} >= 0)`,
    ),
    check(
      "license_server_product_type_skus_sku_length_check",
      sql`char_length(${table.sku}) BETWEEN 1 AND 160`,
    ),
    index("license_server_product_type_skus_product_idx").on(
      table.productTypeId,
      table.status,
    ),
  ],
);

export const licenseServerLicenses = pgTable(
  "license_server_licenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apiClientId: uuid("api_client_id")
      .notNull()
      .references(() => licenseServerApiClients.id, { onDelete: "restrict" }),
    productTypeId: uuid("product_type_id")
      .notNull()
      .references(() => licenseServerProductTypes.id, {
        onDelete: "restrict",
      }),
    skuId: uuid("sku_id")
      .notNull()
      .references(() => licenseServerProductTypeSkus.id, {
        onDelete: "restrict",
      }),
    skuSnapshot: text("sku_snapshot").notNull(),
    domain: text("domain"),
    customerEmail: text("customer_email"),
    customerName: text("customer_name"),
    source: text("source"),
    sourceOrderRef: text("source_order_ref"),
    sourceOrderItemRef: text("source_order_item_ref"),
    licenseType: text("license_type").notNull().default("perpetual"),
    maxDevices: integer("max_devices"),
    maxDomains: integer("max_domains"),
    maxSeats: integer("max_seats"),
    features: jsonb("features")
      .notNull()
      .default(sql`'[]'::jsonb`),
    durationDays: integer("duration_days").notNull().default(0),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    licenseKeyHash: text("license_key_hash").notNull(),
    encryptedLicenseKey: text("encrypted_license_key"),
    licensePayload: jsonb("license_payload")
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: text("status").notNull().default("active"),
    orderRef: text("order_ref"),
    orderItemRef: text("order_item_ref"),
    idempotencyKey: text("idempotency_key").notNull(),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedReason: text("suspended_reason"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: text("revoked_reason"),
    graceEndsAt: timestamp("grace_ends_at", { withTimezone: true }),
    lastValidatedAt: timestamp("last_validated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("license_server_licenses_client_idempotency_unique").on(
      table.apiClientId,
      table.idempotencyKey,
    ),
    uniqueIndex("license_server_licenses_key_hash_unique").on(
      table.licenseKeyHash,
    ),
    check(
      "license_server_licenses_status_check",
      sql`${table.status} IN ('active','suspended','revoked','expired','refunded','chargeback')`,
    ),
    check(
      "license_server_licenses_license_type_check",
      sql`${table.licenseType} IN ('perpetual','subscription','trial','maintenance')`,
    ),
    check(
      "license_server_licenses_limits_check",
      sql`(${table.maxDevices} IS NULL OR ${table.maxDevices} >= 0) AND (${table.maxDomains} IS NULL OR ${table.maxDomains} >= 0) AND (${table.maxSeats} IS NULL OR ${table.maxSeats} >= 0)`,
    ),
    check(
      "license_server_licenses_key_hash_length_check",
      sql`char_length(${table.licenseKeyHash}) = 64`,
    ),
    check(
      "license_server_licenses_domain_length_check",
      sql`${table.domain} IS NULL OR char_length(${table.domain}) <= 255`,
    ),
    index("license_server_licenses_sku_idx").on(
      table.skuId,
      table.status,
      table.createdAt,
    ),
    index("license_server_licenses_order_ref_idx").on(
      table.orderRef,
      table.orderItemRef,
    ),
    index("license_server_licenses_customer_email_idx").on(table.customerEmail),
    index("license_server_licenses_source_idx").on(
      table.source,
      table.sourceOrderRef,
      table.sourceOrderItemRef,
    ),
  ],
);

export const licenseServerLicenseActivations = pgTable(
  "license_server_license_activations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    licenseId: uuid("license_id")
      .notNull()
      .references(() => licenseServerLicenses.id, { onDelete: "cascade" }),
    apiClientId: uuid("api_client_id").references(
      () => licenseServerApiClients.id,
      { onDelete: "set null" },
    ),
    activationType: text("activation_type").notNull(),
    activationFingerprintHash: text("activation_fingerprint_hash").notNull(),
    activationLabel: text("activation_label"),
    domain: text("domain"),
    deviceIdHash: text("device_id_hash"),
    machineFingerprintHash: text("machine_fingerprint_hash"),
    appId: text("app_id"),
    appVersion: text("app_version"),
    platform: text("platform"),
    activationTokenHash: text("activation_token_hash").notNull(),
    status: text("status").notNull().default("active"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
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
    unique("license_server_license_activations_license_fingerprint_unique").on(
      table.licenseId,
      table.activationFingerprintHash,
    ),
    check(
      "license_server_license_activations_status_check",
      sql`${table.status} IN ('active','deactivated','revoked','expired')`,
    ),
    check(
      "license_server_license_activations_type_check",
      sql`${table.activationType} IN ('domain','device','server','seat')`,
    ),
    check(
      "license_server_license_activations_token_hash_length_check",
      sql`char_length(${table.activationTokenHash}) = 64`,
    ),
    check(
      "license_server_license_activations_fingerprint_length_check",
      sql`char_length(${table.activationFingerprintHash}) = 64`,
    ),
    index("license_server_license_activations_license_status_idx").on(
      table.licenseId,
      table.status,
    ),
    index("license_server_license_activations_token_idx").on(
      table.activationTokenHash,
    ),
    index("license_server_license_activations_domain_idx").on(table.domain),
    index("license_server_license_activations_device_idx").on(
      table.deviceIdHash,
    ),
    index("license_server_license_activations_last_seen_idx").on(
      table.lastSeenAt,
    ),
  ],
);

export const licenseServerAuditEvents = pgTable(
  "license_server_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: text("actor_user_id"),
    apiClientId: uuid("api_client_id").references(
      () => licenseServerApiClients.id,
      { onDelete: "set null" },
    ),
    licenseId: uuid("license_id").references(() => licenseServerLicenses.id, {
      onDelete: "set null",
    }),
    activationId: uuid("activation_id").references(
      () => licenseServerLicenseActivations.id,
      { onDelete: "set null" },
    ),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("license_server_audit_events_license_idx").on(
      table.licenseId,
      table.createdAt,
    ),
    index("license_server_audit_events_activation_idx").on(
      table.activationId,
      table.createdAt,
    ),
    index("license_server_audit_events_api_client_idx").on(
      table.apiClientId,
      table.createdAt,
    ),
    index("license_server_audit_events_action_idx").on(
      table.action,
      table.createdAt,
    ),
  ],
);

export const licenseServerValidationEvents = pgTable(
  "license_server_validation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apiClientId: uuid("api_client_id").references(
      () => licenseServerApiClients.id,
      { onDelete: "set null" },
    ),
    licenseId: uuid("license_id").references(() => licenseServerLicenses.id, {
      onDelete: "set null",
    }),
    licenseKeyHash: text("license_key_hash"),
    domain: text("domain"),
    result: text("result").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "license_server_validation_events_result_check",
      sql`${table.result} IN ('valid','invalid')`,
    ),
    index("license_server_validation_events_license_idx").on(
      table.licenseId,
      table.createdAt,
    ),
    index("license_server_validation_events_created_idx").on(table.createdAt),
    index("license_server_validation_events_api_client_idx").on(
      table.apiClientId,
      table.createdAt,
    ),
  ],
);

export const securityRateLimitBuckets = pgTable(
  "security_rate_limit_buckets",
  {
    bucketHash: text("bucket_hash").primaryKey(),
    count: integer("count").notNull().default(0),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("security_rate_limit_buckets_reset_idx").on(table.resetAt)],
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

/** Target-side transfer evidence; it never stores the approval code plaintext. */
export const cmsAddonTransferPreparations = pgTable("cms_addon_transfer_preparations", {
  transferId: uuid("transfer_id").primaryKey(),
  entitlementId: uuid("entitlement_id"),
  sourceActivationId: uuid("source_activation_id").notNull(),
  sourceCanonicalDomain: text("source_canonical_domain"),
  targetCanonicalDomain: text("target_canonical_domain").notNull(),
  targetInstallationId: uuid("target_installation_id").notNull(),
  targetInstallationKeyFingerprint: text("target_installation_key_fingerprint").notNull(),
  targetChallengeId: uuid("target_challenge_id").notNull(),
  sourceApprovalDerivationKid: text("source_approval_derivation_kid"),
  sourceApprovalCodeHash: text("source_approval_code_hash"),
  status: text("status").notNull().default("requested"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  check("cms_addon_transfer_preparations_status_check", sql`${table.status} IN ('requested','target_proved','completed','canceled','expired')`),
  check("cms_addon_transfer_preparations_hash_check", sql`${table.sourceApprovalCodeHash} IS NULL OR ${table.sourceApprovalCodeHash} ~ '^sha256:[a-f0-9]{64}$'`),
]);

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
    frontendLanguage: text("frontend_language").notNull().default("en"),
    backendLanguage: text("backend_language").notNull().default("en"),
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
      "global_settings_frontend_language_check",
      sql`${table.frontendLanguage} IN ('en','sr-Latn','sr-Cyrl','hr','de','fr','es','it','pt','pt-BR','nl','pl','tr','mk','bs','sl','ru','hu','bg','ja','zh-Hans','zh-Hant','ar','id','cs','ro','el','da','sv','nb','nn','fi','is')`,
    ),
    check(
      "global_settings_backend_language_check",
      sql`${table.backendLanguage} IN ('en','sr-Latn','sr-Cyrl','hr','de','fr','es','it','pt','pt-BR','nl','pl','tr','mk','bs','sl','ru','hu','bg','ja','zh-Hans','zh-Hant','ar','id','cs','ro','el','da','sv','nb','nn','fi','is')`,
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
export const cmsCoreMigrationReceipts = pgTable(
  "cms_core_migration_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    target: text("target").notNull(),
    databaseResourceId: text("database_resource_id").notNull(),
    manifestHash: text("manifest_hash").notNull(),
    migrationSetHash: text("migration_set_hash").notNull(),
    status: text("status").notNull().default("applied"),
    appliedAt: timestamp("applied_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("cms_core_migration_receipts_target_hash_unique").on(
      table.target,
      table.manifestHash,
      table.migrationSetHash,
    ),
    index("cms_core_migration_receipts_target_applied_at_idx").on(
      table.target,
      table.appliedAt,
    ),
    check(
      "cms_core_migration_receipts_status_check",
      sql`${table.status} = 'applied'`,
    ),
  ],
);
