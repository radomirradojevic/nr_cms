import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getRoles, hasRole } from "@/lib/roles";
import { getTopMenuTree, listPickableContent } from "@/data/top-menu";
import { TopMenuBuilder } from "./top-menu-builder";

export default async function TopMenuPage() {
  const user = await currentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) {
    redirect("/dashboard");
  }

  const [tree, pickable] = await Promise.all([
    getTopMenuTree(),
    listPickableContent(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Top Menu</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Drag content items from the left into the menu on the right. Reorder
          by dragging existing items up/down or sideways to nest. Admin access
          only.
        </p>
      </div>

      <TopMenuBuilder initialTree={tree} pickable={pickable} />
    </div>
  );
}
