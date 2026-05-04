import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAllCategories } from "@/data/content-categories";
import { hasRole, getRoles } from "@/lib/roles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateCategoryDialog } from "./create-category-dialog";
import { EditCategoryDialog } from "./edit-category-dialog";
import { DeleteCategoryDialog } from "./delete-category-dialog";

export default async function ContentCategoriesPage() {
  const user = await currentUser();
  const roles = getRoles(user?.publicMetadata);

  if (!hasRole(roles, "admin")) {
    redirect("/dashboard");
  }

  const categories = await getAllCategories();

  const pageCategories = categories.filter((c) => c.contentType === "page");
  const blogCategories = categories.filter(
    (c) => c.contentType === "blog_post",
  );

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Content Categories</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage categories for pages and blog posts. Admin access only.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Page Categories */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Page Categories</h2>
            <CreateCategoryDialog contentType="page" />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageCategories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center text-muted-foreground"
                  >
                    No page categories yet.
                  </TableCell>
                </TableRow>
              ) : (
                pageCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <EditCategoryDialog category={category} />
                        <DeleteCategoryDialog category={category} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>

        {/* Blog Post Categories */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Blog Post Categories</h2>
            <CreateCategoryDialog contentType="blog_post" />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blogCategories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center text-muted-foreground"
                  >
                    No blog post categories yet.
                  </TableCell>
                </TableRow>
              ) : (
                blogCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <EditCategoryDialog category={category} />
                        <DeleteCategoryDialog category={category} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>
      </div>
    </div>
  );
}
