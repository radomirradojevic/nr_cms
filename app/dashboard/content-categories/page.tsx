import { redirect } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getDistinctCategoryAuthorIds,
  type ContentCategoryAuthorInfo,
} from "@/data/content-categories";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getTranslations } from "@/lib/i18n/server";
import { hasRole, getRoles } from "@/lib/roles";
import { CategoryTableContainer } from "./category-table-container";
import { WebshopCategoriesBridge } from "./webshop-categories-bridge";

export default async function ContentCategoriesPage() {
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);

  if (!hasRole(roles, "admin")) {
    redirect("/dashboard");
  }

  const [pageAuthorIds, blogAuthorIds, t] = await Promise.all([
    getDistinctCategoryAuthorIds("page"),
    getDistinctCategoryAuthorIds("blog_post"),
    getTranslations("backend"),
  ]);
  const authorIds = [...new Set([...pageAuthorIds, ...blogAuthorIds])];
  const authorNameMap = new Map<string, string>();
  if (authorIds.length > 0) {
    const client = await clerkClient();
    const { data: users } = await client.users.getUserList({
      userId: authorIds,
      limit: authorIds.length,
    });
    for (const author of users) {
      authorNameMap.set(
        author.id,
        author.fullName ||
          author.username ||
          author.primaryEmailAddress?.emailAddress ||
          author.emailAddresses[0]?.emailAddress ||
          author.id,
      );
    }
  }

  const toAuthorOptions = (ids: string[]): ContentCategoryAuthorInfo[] =>
    ids
      .map((id) => ({ id, name: authorNameMap.get(id) ?? id }))
      .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("dashboard.contentCategories.title")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("dashboard.contentCategories.description")}
        </p>
      </div>

      <Tabs defaultValue="page" className="space-y-4">
        <TabsList>
          <TabsTrigger value="page">
            {t("dashboard.contentCategories.tabs.page")}
          </TabsTrigger>
          <TabsTrigger value="blog_post">
            {t("dashboard.contentCategories.tabs.blogPost")}
          </TabsTrigger>
          <TabsTrigger value="webshop">
            {t("dashboard.contentCategories.tabs.webshop")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="page">
          <CategoryTableContainer
            contentType="page"
            authors={toAuthorOptions(pageAuthorIds)}
          />
        </TabsContent>

        <TabsContent value="blog_post">
          <CategoryTableContainer
            contentType="blog_post"
            authors={toAuthorOptions(blogAuthorIds)}
          />
        </TabsContent>

        <TabsContent value="webshop">
          <WebshopCategoriesBridge userId={user!.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
