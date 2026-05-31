import { redirect } from "next/navigation";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { hasRole, getRoles } from "@/lib/roles";
import { getAdminGlobalSettings } from "@/data/global-settings";
import { getFileByIdUnchecked } from "@/data/files";
import { listMenuOptions } from "@/data/top-menu";
import { AdminSectionLockProvider } from "@/components/admin-section-lock-provider";
import { SettingsForm } from "./settings-form";

export default async function GlobalSettingsPage() {
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);

  if (!hasRole(roles, "admin")) {
    redirect("/dashboard");
  }

  const [settings, navigationMenus] = await Promise.all([
    getAdminGlobalSettings(),
    listMenuOptions(),
  ]);
  const initialLogoFile = settings?.siteLogoFileId
    ? await getFileByIdUnchecked(settings.siteLogoFileId)
    : null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Global Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage site-wide configuration. Admin access only.
        </p>
      </div>
      <AdminSectionLockProvider
        sectionKey="global-settings"
        currentUserId={user!.id}
      >
        <SettingsForm
          settings={settings}
          initialLogoFile={initialLogoFile}
          navigationMenus={navigationMenus}
        />
      </AdminSectionLockProvider>
    </div>
  );
}
