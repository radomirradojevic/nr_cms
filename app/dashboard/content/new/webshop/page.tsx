import { redirect } from "next/navigation";

import { getOrCreateWebshopCategory } from "@/data/content-categories";
import { getGlobalSettings } from "@/data/global-settings";
import { canCreateContentType } from "@/lib/content-type-permissions";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles } from "@/lib/roles";
import { ContentForm } from "../../content-form";

export default async function NewWebshopPage() {
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!canCreateContentType(roles, "webshop")) redirect("/dashboard");

  const [category, settings] = await Promise.all([
    getOrCreateWebshopCategory(user!.id),
    getGlobalSettings(),
  ]);

  return (
    <div className="p-6">
      <ContentForm
        mode="create"
        contentType="webshop"
        currentUserRoles={roles}
        categories={[{ id: category.id, name: category.name }]}
        appearance={settings.appearance}
        sessionSecurity={settings.sessionSecurity}
        aiWritingAssistantAvailable={false}
        aiWritingAssistantProviders={[]}
      />
    </div>
  );
}
