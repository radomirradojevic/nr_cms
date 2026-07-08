import { redirect } from "next/navigation";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { hasRole, getRoles } from "@/lib/roles";
import { getAdminGlobalSettings } from "@/data/global-settings";
import { getFileByIdUnchecked } from "@/data/files";
import { listMenuOptions } from "@/data/top-menu";
import { listContentTargetOptions } from "@/data/content";
import { getCategoriesByType } from "@/data/content-categories";
import { AdminSectionLockProvider } from "@/components/admin-section-lock-provider";
import { getTranslations } from "@/lib/i18n/server";
import { SettingsForm } from "./settings-form";

export default async function GlobalSettingsPage() {
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);

  if (!hasRole(roles, "admin")) {
    redirect("/dashboard");
  }

  const [
    t,
    settings,
    navigationMenus,
    visibilityContentTargets,
    blogCategories,
  ] = await Promise.all([
    getTranslations("backend"),
    getAdminGlobalSettings(),
    listMenuOptions(),
    listContentTargetOptions(),
    getCategoriesByType("blog_post"),
  ]);
  const initialLogoFile = settings?.siteLogoFileId
    ? await getFileByIdUnchecked(settings.siteLogoFileId)
    : null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("globalSettings.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("globalSettings.description")}
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
          visibilityContentTargets={visibilityContentTargets}
          visibilityBlogCategories={blogCategories}
        />
      </AdminSectionLockProvider>
    </div>
  );
}
