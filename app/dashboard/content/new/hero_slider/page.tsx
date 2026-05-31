import { redirect } from "next/navigation";
import { getCategoriesByType } from "@/data/content-categories";
import { getGlobalSettings } from "@/data/global-settings";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { ContentForm } from "../../content-form";

export default async function NewHeroSliderPage() {
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  const allowed =
    hasRole(roles, "admin") ||
    hasRole(roles, "publisher") ||
    hasRole(roles, "author");
  if (!allowed) redirect("/dashboard");

  const [categories, settings] = await Promise.all([
    getCategoriesByType("page"),
    getGlobalSettings(),
  ]);

  return (
    <div className="p-6">
      <ContentForm
        mode="create"
        contentType="hero_slider"
        currentUserRoles={roles}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        appearance={settings.appearance}
        sessionSecurity={settings.sessionSecurity}
        aiWritingAssistantAvailable={false}
        aiWritingAssistantProviders={[]}
      />
    </div>
  );
}
