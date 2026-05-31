import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { getCategoriesByType } from "@/data/content-categories";
import { ContentTableContainer } from "./content-table-container";

export default async function ContentPage() {
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  const allowed =
    hasRole(roles, "admin") ||
    hasRole(roles, "publisher") ||
    hasRole(roles, "author");
  if (!allowed) redirect("/dashboard");

  const [pageCats, blogCats] = await Promise.all([
    getCategoriesByType("page"),
    getCategoriesByType("blog_post"),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Content</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage pages, blog posts, and hero sliders.
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
      />
    </div>
  );
}
