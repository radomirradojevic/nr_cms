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
    contentType: text("content_type").notNull(), // "page" | "blog_post"
    createdBy: text("created_by"),
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
    contentType: text("content_type").notNull(), // "page" | "blog_post"
    categoryId: uuid("category_id")
      .notNull()
      .references(() => contentCategories.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    content: text("content"),
    contentJson: jsonb("content_json"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    status: text("status").notNull().default("unpublished"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    excerpt: text("excerpt"),
    coverImage: text("cover_image"),
    slug: text("slug").notNull().unique(),
    authorId: text("author_id").notNull(),
    homepage: boolean("homepage").notNull().default(false),
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
      sql`${table.contentType} IN ('page','blog_post')`,
    ),
    check(
      "content_status_check",
      sql`${table.status} IN ('published','unpublished','archived')`,
    ),
    uniqueIndex("content_only_one_homepage")
      .on(table.homepage)
      .where(sql`${table.homepage} = true`),
    index("content_slug_idx").on(table.slug),
    index("content_status_idx").on(table.status),
    index("content_type_idx").on(table.contentType),
    index("content_category_id_idx").on(table.categoryId),
    index("content_author_id_idx").on(table.authorId),
  ],
);

export const topMenuItems = pgTable(
  "top_menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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
    index("top_menu_items_parent_id_idx").on(table.parentId),
    index("top_menu_items_parent_order_idx").on(table.parentId, table.order),
    index("top_menu_items_content_id_idx").on(table.contentId),
    index("top_menu_items_category_id_idx").on(table.categoryId),
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
    index("galleries_created_by_idx").on(table.createdBy),
    index("galleries_created_idx").on(table.created),
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
    // ─── Appearance enum CHECKs — MUST mirror the arrays in lib/appearance.ts ─
    check(
      "global_settings_theme_check",
      sql`${table.theme} IN ('default','dark','minimal','corporate','cyberpunk','elegant','forest','ocean','sunset','pastel','luxury','obsidian','midnight','aurora')`,
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
