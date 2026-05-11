import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { getContentById } from "@/data/content";
import { getCategoriesByType } from "@/data/content-categories";
import { getRoles, hasRole } from "@/lib/roles";
import { ContentForm } from "../../content-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditContentPage({ params }: Props) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/");
  const roles = getRoles(user.publicMetadata);
  const allowed =
    hasRole(roles, "admin") ||
    hasRole(roles, "publisher") ||
    hasRole(roles, "author");
  if (!allowed) redirect("/dashboard");

  const row = await getContentById(id);
  if (!row) notFound();

  // Permission check (mirrors server actions canEdit)
  const isOwn = row.authorId === user.id;
  const isAdmin = hasRole(roles, "admin");
  const isPublisher = hasRole(roles, "publisher");
  let canEdit = isAdmin || isOwn;
  if (!canEdit && isPublisher) {
    const client = await clerkClient();
    try {
      const author = await client.users.getUser(row.authorId);
      const authorRoles = getRoles(author.publicMetadata);
      const authorTop = authorRoles.includes("admin")
        ? "admin"
        : authorRoles.includes("publisher")
          ? "publisher"
          : authorRoles.includes("author")
            ? "author"
            : "viewer";
      canEdit = authorTop === "author";
    } catch {
      canEdit = false;
    }
  }
  if (!canEdit) redirect("/dashboard/content");

  const categories = await getCategoriesByType(
    row.contentType as "page" | "blog_post",
  );

  return (
    <div className="p-6">
      <ContentForm
        mode="edit"
        contentType={row.contentType as "page" | "blog_post"}
        currentUserRoles={roles}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initial={{
          id: row.id,
          title: row.title,
          slug: row.slug,
          categoryId: row.categoryId,
          metaTitle: row.metaTitle,
          metaDescription: row.metaDescription,
          excerpt: row.excerpt,
          coverImage: row.coverImage,
          status: row.status as "published" | "unpublished" | "archived",
          homepage: row.homepage,
          enableComments: row.enableComments,
          autoPublishComments: row.autoPublishComments,
          allowAnonymousComments: row.allowAnonymousComments,
          contentJson: row.contentJson,
        }}
      />
    </div>
  );
}
