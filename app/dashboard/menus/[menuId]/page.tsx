import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminSectionLockProvider } from "@/components/admin-section-lock-provider";
import { Button } from "@/components/ui/button";
import {
  getMenuById,
  getTopMenuTree,
  listBlogCategories,
  listPickableContent,
} from "@/data/top-menu";
import { getTranslations } from "@/lib/i18n/server";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { TopMenuBuilder } from "../../top-menu/top-menu-builder";

type MenuEditorPageProps = {
  params: Promise<{ menuId: string }>;
};

export default async function MenuEditorPage({ params }: MenuEditorPageProps) {
  const t = await getTranslations("backend");
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) {
    redirect("/dashboard");
  }

  const { menuId } = await params;
  const menu = await getMenuById(menuId);
  if (!menu) notFound();

  const [tree, pickable, categories] = await Promise.all([
    getTopMenuTree(menu.id),
    listPickableContent(),
    listBlogCategories(),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{menu.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dashboard.menus.editorDescription")}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/menus">
            {t("dashboard.common.actions.backToMenus")}
          </Link>
        </Button>
      </div>

      <AdminSectionLockProvider sectionKey="menus" currentUserId={user!.id}>
        <TopMenuBuilder
          menuId={menu.id}
          initialTree={tree}
          pickable={pickable}
          categories={categories}
        />
      </AdminSectionLockProvider>
    </div>
  );
}
