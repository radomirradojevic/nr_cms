import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getRoles, hasRole } from "@/lib/roles";
import {
  getTopMenuTree,
  listPickableContent,
  listBlogCategories,
} from "@/data/top-menu";
import { AdminSectionLockProvider } from "@/components/admin-section-lock-provider";
import { TopMenuBuilder } from "./top-menu-builder";

export default async function TopMenuPage() {
  const user = await currentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) {
    redirect("/dashboard");
  }

  const [tree, pickable, categories] = await Promise.all([
    getTopMenuTree(),
    listPickableContent(),
    listBlogCategories(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Top Menu</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Drag content items from the left into the menu on the right. Reorder
          by dragging existing items up/down or sideways to nest. Use &quot;Add
          blog category&quot; to link to a list of posts in a category, or
          &quot;Add custom link&quot; for a free-form URL. Admin access only.
        </p>
      </div>

      <AdminSectionLockProvider sectionKey="top-menu" currentUserId={user!.id}>
        <TopMenuBuilder
          initialTree={tree}
          pickable={pickable}
          categories={categories}
        />
      </AdminSectionLockProvider>
    </div>
  );
}
