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
