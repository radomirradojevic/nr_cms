import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSectionLockProvider } from "@/components/admin-section-lock-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminGlobalSettings } from "@/data/global-settings";
import { listMenusWithItemCounts } from "@/data/top-menu";
import { HeaderSettingsSchema } from "@/lib/global-settings";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { CreateMenuDialog } from "./create-menu-dialog";
import { MenuRowActions } from "./menu-row-actions";

export default async function MenusPage() {
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) {
    redirect("/dashboard");
  }

  const [menuRows, settings] = await Promise.all([
    listMenusWithItemCounts(),
    getAdminGlobalSettings(),
  ]);
  const headerSettings = HeaderSettingsSchema.safeParse(
    settings?.headerSettings,
  );
  const selectedNavigationMenuId = headerSettings.success
    ? headerSettings.data.navigationMenuId
    : null;

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

        {menuRows.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center">
            <h2 className="text-base font-medium">No menus yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a menu to start building header navigation.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-32">Items</TableHead>
                  <TableHead className="w-32">Nested</TableHead>
                  <TableHead className="w-48">Updated</TableHead>
                  <TableHead className="w-48 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuRows.map((menu) => (
                  <TableRow key={menu.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/menus/${menu.id}`}
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {menu.name}
                      </Link>
                      {selectedNavigationMenuId === menu.id && (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Header
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{menu.totalItems}</TableCell>
                    <TableCell>{menu.nestedItems}</TableCell>
                    <TableCell>
                      {menu.updatedAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <MenuRowActions
                        menu={{ id: menu.id, name: menu.name }}
                        isHeaderMenu={selectedNavigationMenuId === menu.id}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </AdminSectionLockProvider>
    </div>
  );
}
