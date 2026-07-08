import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FileText,
  Images,
  KeyRound,
  LayoutTemplate,
  Store,
} from "lucide-react";
import { getTranslations } from "@/lib/i18n/server";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { canCreateContentType } from "@/lib/content-type-permissions";

export default async function NewContentChoicePage() {
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  const allowed =
    hasRole(roles, "admin") ||
    hasRole(roles, "publisher") ||
    hasRole(roles, "author");
  if (!allowed) redirect("/dashboard");
  const canManagePaidAddons = canCreateContentType(roles, "webshop");
  const t = await getTranslations("backend");

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("dashboard.content.newChoice.title")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("dashboard.content.newChoice.description")}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/content/new/page"
          className="rounded-lg border p-6 hover:border-primary transition-colors group"
        >
          <LayoutTemplate className="h-10 w-10 text-muted-foreground group-hover:text-primary" />
          <h2 className="mt-4 text-lg font-semibold">
            {t("dashboard.content.newChoice.pageTitle")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("dashboard.content.newChoice.pageDescription")}
          </p>
        </Link>
        <Link
          href="/dashboard/content/new/blog_post"
          className="rounded-lg border p-6 hover:border-primary transition-colors group"
        >
          <FileText className="h-10 w-10 text-muted-foreground group-hover:text-primary" />
          <h2 className="mt-4 text-lg font-semibold">
            {t("dashboard.content.newChoice.blogPostTitle")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("dashboard.content.newChoice.blogPostDescription")}
          </p>
        </Link>
        <Link
          href="/dashboard/content/new/hero_slider"
          className="rounded-lg border p-6 hover:border-primary transition-colors group"
        >
          <Images className="h-10 w-10 text-muted-foreground group-hover:text-primary" />
          <h2 className="mt-4 text-lg font-semibold">
            {t("dashboard.content.newChoice.heroSliderTitle")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("dashboard.content.newChoice.heroSliderDescription")}
          </p>
        </Link>
        {canManagePaidAddons && (
          <>
            <Link
              href="/dashboard/webshop"
              className="rounded-lg border p-6 hover:border-primary transition-colors group"
            >
              <Store className="h-10 w-10 text-muted-foreground group-hover:text-primary" />
              <h2 className="mt-4 text-lg font-semibold">
                {t("dashboard.content.newChoice.webshopTitle")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("dashboard.content.newChoice.webshopDescription")}
              </p>
            </Link>
            <Link
              href="/dashboard/license-server"
              className="rounded-lg border p-6 hover:border-primary transition-colors group"
            >
              <KeyRound className="h-10 w-10 text-muted-foreground group-hover:text-primary" />
              <h2 className="mt-4 text-lg font-semibold">
                {t("dashboard.content.newChoice.licenseServerTitle")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("dashboard.content.newChoice.licenseServerDescription")}
              </p>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
