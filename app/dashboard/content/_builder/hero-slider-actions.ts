"use server";

import { z } from "zod";
import { getContentById, listContent } from "@/data/content";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";

export type HeroSliderPickerItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
  publishAt: Date | null;
  unpublishAt: Date | null;
};

async function canUseContentTools() {
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  return (
    hasRole(roles, "admin") ||
    hasRole(roles, "publisher") ||
    hasRole(roles, "author")
  );
}

export async function fetchHeroSliderPickerItems(input?: {
  search?: string;
}): Promise<
  { error: string } | { success: true; rows: HeroSliderPickerItem[] }
> {
  if (!(await canUseContentTools())) return { error: "Forbidden." };

  const parsed = z
    .object({ search: z.string().max(200).optional() })
    .optional()
    .safeParse(input);
  if (!parsed.success) return { error: "Invalid search." };

  const { rows } = await listContent({
    page: 1,
    pageSize: 100,
    contentType: "hero_slider",
    search: parsed.data?.search?.trim() || undefined,
    sort: "title_asc",
  });

  return {
    success: true,
    rows: rows.map((row) => ({
      id: row.id,
      name: row.title,
      slug: row.slug,
      status: row.status,
      publishAt: row.publishAt,
      unpublishAt: row.unpublishAt,
    })),
  };
}

export async function fetchHeroSliderPreview(input: { id: string }): Promise<
  | { error: string }
  | {
      success: true;
      item: HeroSliderPickerItem & { contentJson: unknown };
    }
> {
  if (!(await canUseContentTools())) return { error: "Forbidden." };

  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { error: "Invalid slider." };

  const row = await getContentById(parsed.data.id);
  if (!row || row.contentType !== "hero_slider") {
    return { error: "Hero slider not found." };
  }

  return {
    success: true,
    item: {
      id: row.id,
      name: row.title,
      slug: row.slug,
      status: row.status,
      publishAt: row.publishAt,
      unpublishAt: row.unpublishAt,
      contentJson: row.contentJson,
    },
  };
}
