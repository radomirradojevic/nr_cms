import { db } from "@/db";
import {
  content,
  files,
  galleries,
  galleryImages,
  contentCategories,
  topMenuItems,
  forms,
  formSubmissions,
} from "@/db/schema";
import { clerkClient } from "@clerk/nextjs/server";
import { sql } from "drizzle-orm";
import { getRoles } from "@/lib/roles";

export type DashboardStats = {
  content: {
    totalPages: number;
    totalBlogPosts: number;
    totalHeroSliders: number;
  };
  files: { total: number; images: number; videos: number; documents: number };
  galleries: { totalGalleries: number; totalImages: number };
  categories: { total: number; pageCategories: number; blogCategories: number };
  topMenu: { totalItems: number; nestedItems: number };
  forms: { totalForms: number; totalSubmissions: number };
  users: {
    total: number;
    admins: number;
    publishers: number;
    authors: number;
    viewers: number;
  };
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    contentRows,
    fileRows,
    galleriesCount,
    galleryImagesCount,
    categoryRows,
    topMenuCount,
    nestedMenuCount,
    formsCount,
    submissionsCount,
    clerkUsers,
  ] = await Promise.all([
    db
      .select({
        contentType: content.contentType,
        count: sql<number>`count(*)::int`,
      })
      .from(content)
      .groupBy(content.contentType),

    db
      .select({
        kind: files.kind,
        count: sql<number>`count(*)::int`,
      })
      .from(files)
      .groupBy(files.kind),

    db.select({ count: sql<number>`count(*)::int` }).from(galleries),

    db.select({ count: sql<number>`count(*)::int` }).from(galleryImages),

    db
      .select({
        contentType: contentCategories.contentType,
        count: sql<number>`count(*)::int`,
      })
      .from(contentCategories)
      .groupBy(contentCategories.contentType),

    db.select({ count: sql<number>`count(*)::int` }).from(topMenuItems),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(topMenuItems)
      .where(sql`${topMenuItems.parentId} IS NOT NULL`),

    db.select({ count: sql<number>`count(*)::int` }).from(forms),

    db.select({ count: sql<number>`count(*)::int` }).from(formSubmissions),

    (await clerkClient()).users.getUserList({ limit: 500 }),
  ]);

  const totalPages =
    contentRows.find((r) => r.contentType === "page")?.count ?? 0;
  const totalBlogPosts =
    contentRows.find((r) => r.contentType === "blog_post")?.count ?? 0;
  const totalHeroSliders =
    contentRows.find((r) => r.contentType === "hero_slider")?.count ?? 0;

  const totalImages = fileRows.find((r) => r.kind === "image")?.count ?? 0;
  const totalVideos = fileRows.find((r) => r.kind === "video")?.count ?? 0;
  const totalDocuments =
    fileRows.find((r) => r.kind === "document")?.count ?? 0;
  const totalFiles = totalImages + totalVideos + totalDocuments;

  const pageCategories =
    categoryRows.find((r) => r.contentType === "page")?.count ?? 0;
  const blogCategories =
    categoryRows.find((r) => r.contentType === "blog_post")?.count ?? 0;
  const totalCategories = pageCategories + blogCategories;

  const users = clerkUsers.data;
  let admins = 0,
    publishers = 0,
    authors = 0,
    viewers = 0;
  for (const user of users) {
    const roles = getRoles(user.publicMetadata);
    if (roles.includes("admin")) admins++;
    else if (roles.includes("publisher")) publishers++;
    else if (roles.includes("author")) authors++;
    else viewers++;
  }

  return {
    content: { totalPages, totalBlogPosts, totalHeroSliders },
    files: {
      total: totalFiles,
      images: totalImages,
      videos: totalVideos,
      documents: totalDocuments,
    },
    galleries: {
      totalGalleries: galleriesCount[0]?.count ?? 0,
      totalImages: galleryImagesCount[0]?.count ?? 0,
    },
    categories: { total: totalCategories, pageCategories, blogCategories },
    topMenu: {
      totalItems: topMenuCount[0]?.count ?? 0,
      nestedItems: nestedMenuCount[0]?.count ?? 0,
    },
    forms: {
      totalForms: formsCount[0]?.count ?? 0,
      totalSubmissions: submissionsCount[0]?.count ?? 0,
    },
    users: { total: users.length, admins, publishers, authors, viewers },
  };
}
