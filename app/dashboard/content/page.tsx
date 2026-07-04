import Link from "next/link";
import { redirect } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { getCategoriesByType } from "@/data/content-categories";
import {
  getDistinctContentAuthorIds,
  type ContentAuthorInfo,
} from "@/data/content";
import { ContentTableContainer } from "./content-table-container";

export default async function ContentPage() {
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  const allowed =
    hasRole(roles, "admin") ||
    hasRole(roles, "publisher") ||
    hasRole(roles, "author");
  if (!allowed) redirect("/dashboard");

  const [pageCats, blogCats, webshopCats, authorIds] = await Promise.all([
    getCategoriesByType("page"),
    getCategoriesByType("blog_post"),
    getCategoriesByType("webshop"),
    getDistinctContentAuthorIds(),
  ]);
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
        [author.firstName, author.lastName].filter(Boolean).join(" ") ||
          author.username ||
          author.primaryEmailAddress?.emailAddress ||
          author.emailAddresses[0]?.emailAddress ||
          author.id,
      );
    }
  }
  const authors: ContentAuthorInfo[] = authorIds
    .map((id) => ({ id, name: authorNameMap.get(id) ?? id }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Content</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage pages, blog posts, hero sliders, and webshops.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/content/new">
            <Plus className="mr-2 h-4 w-4" />
            Create content
          </Link>
        </Button>
      </div>

      <ContentTableContainer
        currentUserId={user!.id}
        currentUserRoles={roles}
        pageCategories={pageCats.map((c) => ({ id: c.id, name: c.name }))}
        blogCategories={blogCats.map((c) => ({ id: c.id, name: c.name }))}
        webshopCategories={webshopCats.map((c) => ({
          id: c.id,
          name: c.name,
        }))}
        authors={authors}
      />
    </div>
  );
}
