import { redirect } from "next/navigation";

import { AdminSectionLockProvider } from "@/components/admin-section-lock-provider";
import { getAdminGlobalSettings } from "@/data/global-settings";
import { listMenuCreators, listMenusWithItemCounts } from "@/data/top-menu";
import { HeaderSettingsSchema } from "@/lib/global-settings";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { CreateMenuDialog } from "./create-menu-dialog";
import { MenusList } from "./menus-list";

const PAGE_SIZE = 20;

export default async function MenusPage() {
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) {
    redirect("/dashboard");
  }

  const [{ rows: menuRows, total }, creators, settings] = await Promise.all([
    listMenusWithItemCounts({ limit: PAGE_SIZE, offset: 0 }),
    listMenuCreators(),
    getAdminGlobalSettings(),
  ]);
  const headerSettings = HeaderSettingsSchema.safeParse(
    settings?.headerSettings,
  );
  const selectedNavigationMenuId = headerSettings.success
    ? headerSettings.data.navigationMenuId
    : null;
  const menusListKey = `${total}:${menuRows.map((menu) => menu.id).join("|")}`;

  return (
    <div className="space-y-6 p-6">
      <AdminSectionLockProvider sectionKey="menus" currentUserId={user!.id}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Menus</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create and manage reusable navigation menus. Admin access only.
            </p>
          </div>
          <CreateMenuDialog />
        </div>

        <MenusList
          key={menusListKey}
          initialRows={menuRows}
          initialTotal={total}
          pageSize={PAGE_SIZE}
          creators={creators}
          selectedNavigationMenuId={selectedNavigationMenuId}
        />
      </AdminSectionLockProvider>
    </div>
  );
}
