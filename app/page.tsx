import Link from "next/link";
import { getHomepageContent } from "@/data/content";
import {
  BuilderLeadingHeroSlider,
  BuilderRender,
  builderHasBodyAfterLeadingHero,
  builderHasLeadingHeroSlider,
} from "@/app/dashboard/content/_builder/server-render-rsc";
import { Button } from "@/components/ui/button";
import { ContentUnauthorized } from "@/components/content-unauthorized";
import { PageTemplate } from "@/components/page-template";
import { getGlobalSettings } from "@/data/global-settings";
import { canViewContent } from "@/lib/content-visibility";
import { resolveAppearanceContentTemplates } from "@/lib/appearance-recipe";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getTranslations } from "@/lib/i18n/server";
import { getRoles } from "@/lib/roles";

export default async function Home() {
  const homepage = await getHomepageContent();

  if (homepage) {
    const me = await getOptionalCurrentUser(true);
    const viewerRoles = me ? getRoles(me.publicMetadata) : null;
    if (!canViewContent(homepage.visibility, viewerRoles)) {
      return <ContentUnauthorized />;
    }
    const settings = await getGlobalSettings();
    const contentTemplates = resolveAppearanceContentTemplates(
      settings.resolvedAppearanceRecipe?.contentTemplates,
    );
    const pageTemplate = contentTemplates.page;
    const mainVariant = settings.resolvedAppearanceRecipe.shell.main.variant;
    const shouldDetachLeadingHero =
      builderHasLeadingHeroSlider(homepage.contentJson) &&
      (pageTemplate.variant === "framed-builder" || mainVariant === "framed");
    return (
      <PageTemplate
        template={pageTemplate}
        mainVariant={mainVariant}
        leading={
          shouldDetachLeadingHero ? (
            <BuilderLeadingHeroSlider data={homepage.contentJson} />
          ) : undefined
        }
        hasBody={
          shouldDetachLeadingHero
            ? builderHasBodyAfterLeadingHero(homepage.contentJson)
            : undefined
        }
      >
        <BuilderRender
          data={homepage.contentJson}
          omitLeadingHero={shouldDetachLeadingHero}
        />
      </PageTemplate>
    );
  }

  const t = await getTranslations("frontend");

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <main className="w-full max-w-2xl rounded-lg border bg-card p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("public.home.noHomepage.title")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("public.home.noHomepage.description")}
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild>
            <Link href="/dashboard/content">
              {t("public.home.noHomepage.goToContentDashboard")}
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
