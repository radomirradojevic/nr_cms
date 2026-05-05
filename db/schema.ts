import {
  pgTable,
  text,
  timestamp,
  uuid,
  unique,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  check,
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
