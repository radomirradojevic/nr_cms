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
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { TopMenuBuilder } from "../../top-menu/top-menu-builder";

type MenuEditorPageProps = {
  params: Promise<{ menuId: string }>;
};

export default async function MenuEditorPage({ params }: MenuEditorPageProps) {
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
            Drag content items from the left into the menu on the right. Reorder
            by dragging existing items up/down or sideways to nest. Use
            &quot;Add blog category&quot; to link to a list of posts in a
            category, or &quot;Add custom link&quot; for a free-form URL. Admin
            access only.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/menus">Back to Menus</Link>
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
