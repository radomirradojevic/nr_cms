import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";

import { getRoles, hasRole } from "@/lib/roles";
import { listGalleries } from "@/data/galleries";
import { GalleryList } from "./gallery-list";
import { CreateGalleryDialog } from "./create-gallery-dialog";

const ALLOWED_ROLES = ["admin", "publisher", "author"] as const;
const PAGE_SIZE = 24;

export default async function GalleryManagerPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const user = await currentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!roles.some((r) => (ALLOWED_ROLES as readonly string[]).includes(r))) {
    redirect("/dashboard");
  }
  const isAdmin = hasRole(roles, "admin");

  const { rows, total } = await listGalleries({
    caller: { userId, isAdmin },
    limit: PAGE_SIZE,
    offset: 0,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Gallery Manager</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Organize images from the File Manager into named galleries.
          </p>
        </div>
        <CreateGalleryDialog />
      </div>

      <GalleryList
        initialRows={rows}
        initialTotal={total}
        pageSize={PAGE_SIZE}
        isAdmin={isAdmin}
      />
    </div>
  );
}
