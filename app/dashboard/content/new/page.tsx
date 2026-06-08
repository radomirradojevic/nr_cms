import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Images, LayoutTemplate, Store } from "lucide-react";
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
  const canCreateWebshop = canCreateContentType(roles, "webshop");

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create content</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Choose what you want to create.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/content/new/page"
          className="rounded-lg border p-6 hover:border-primary transition-colors group"
        >
          <LayoutTemplate className="h-10 w-10 text-muted-foreground group-hover:text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Page</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Build a static page with the visual page builder.
          </p>
        </Link>
        <Link
          href="/dashboard/content/new/blog_post"
          className="rounded-lg border p-6 hover:border-primary transition-colors group"
        >
          <FileText className="h-10 w-10 text-muted-foreground group-hover:text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Blog post</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Write a blog post with the rich-text editor.
          </p>
        </Link>
        <Link
          href="/dashboard/content/new/hero_slider"
          className="rounded-lg border p-6 hover:border-primary transition-colors group"
        >
          <Images className="h-10 w-10 text-muted-foreground group-hover:text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Hero Slider</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create reusable hero slides for page builder embeds.
          </p>
        </Link>
        {canCreateWebshop && (
          <Link
            href="/dashboard/webshop"
            className="rounded-lg border p-6 hover:border-primary transition-colors group"
          >
            <Store className="h-10 w-10 text-muted-foreground group-hover:text-primary" />
            <h2 className="mt-4 text-lg font-semibold">Webshop</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Set up the paid commerce add-on and CMS shell.
            </p>
          </Link>
        )}
      </div>
    </div>
  );
}
