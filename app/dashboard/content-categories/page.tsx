import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { hasRole, getRoles } from "@/lib/roles";
import { CategoryTableContainer } from "./category-table-container";

export default async function ContentCategoriesPage() {
  const user = await currentUser();
  const roles = getRoles(user?.publicMetadata);

  if (!hasRole(roles, "admin")) {
    redirect("/dashboard");
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Content Categories</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage categories for pages and blog posts. Admin access only.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <CategoryTableContainer contentType="page" />
        </section>

        <section>
          <CategoryTableContainer contentType="blog_post" />
        </section>
      </div>
    </div>
  );
}
