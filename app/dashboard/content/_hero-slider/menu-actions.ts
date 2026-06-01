"use server";

import { auth } from "@clerk/nextjs/server";
import { listMenuOptions, type MenuOption } from "@/data/top-menu";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";

export type HeroSliderMenuOption = MenuOption;

async function canPickMenus() {
  const { userId } = await auth();
  if (!userId) return false;

  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  return (
    hasRole(roles, "admin") ||
    hasRole(roles, "publisher") ||
    hasRole(roles, "author")
  );
}

export async function fetchHeroSliderMenuOptions(): Promise<
  { success: true; rows: HeroSliderMenuOption[] } | { error: string }
> {
  if (!(await canPickMenus())) return { error: "Forbidden." };

  try {
    return { success: true, rows: await listMenuOptions() };
  } catch (err) {
    console.error("[fetchHeroSliderMenuOptions] error", err);
    return { error: "Could not load menus." };
  }
}
