import Link from "next/link";
import { getHomepageContent } from "@/data/content";
import { BuilderRender } from "@/app/dashboard/content/_builder/server-render-rsc";
import { Button } from "@/components/ui/button";
import { ContentUnauthorized } from "@/components/content-unauthorized";
import { PageTemplate } from "@/components/page-template";
import { getGlobalSettings } from "@/data/global-settings";
import { canViewContent } from "@/lib/content-visibility";
import { resolveAppearanceContentTemplates } from "@/lib/appearance-recipe";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles } from "@/lib/roles";

export default async function Home() {
  const homepage = await getHomepageContent();

  if (homepage && homepage.status === "published") {
    const me = await getOptionalCurrentUser(true);
    const viewerRoles = me ? getRoles(me.publicMetadata) : null;
    if (!canViewContent(homepage.visibility, viewerRoles)) {
      return <ContentUnauthorized />;
    }
    const settings = await getGlobalSettings();
    const contentTemplates = resolveAppearanceContentTemplates(
      settings.resolvedAppearanceRecipe?.contentTemplates,
    );
    return (
      <PageTemplate template={contentTemplates.page}>
        <BuilderRender data={homepage.contentJson} />
      </PageTemplate>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <main className="w-full max-w-2xl rounded-lg border bg-card p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          No homepage configured
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This site does not yet have a page assigned as its homepage. To set
          one up, open the dashboard, create or pick a published{" "}
          <span className="font-medium">page</span>, and use the row action{" "}
          <span className="font-medium">&ldquo;Set as homepage&rdquo;</span>.
          Only users with the <span className="font-medium">admin</span> role
          can assign the homepage.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild>
            <Link href="/dashboard/content">Go to content dashboard</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
