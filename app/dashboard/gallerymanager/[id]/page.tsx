import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ChevronLeft } from "lucide-react";

import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { getGalleryById } from "@/data/galleries";
import { listFiles } from "@/data/files";
import { Button } from "@/components/ui/button";
import { GalleryEditor } from "./gallery-editor";

const ALLOWED_ROLES = ["admin", "publisher", "author"] as const;
const PICKER_PAGE_SIZE = 60;

export default async function GalleryEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { userId } = await auth();
  if (!userId) redirect("/");

  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!roles.some((r) => (ALLOWED_ROLES as readonly string[]).includes(r))) {
    redirect("/dashboard");
  }
  const isAdmin = hasRole(roles, "admin");

  const gallery = await getGalleryById(id, { userId, isAdmin });
  if (!gallery) notFound();

  const { rows: pickerFiles, total: pickerTotal } = await listFiles({
    caller: { userId, isAdmin },
    kind: "image",
    limit: PICKER_PAGE_SIZE,
    offset: 0,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/dashboard/gallerymanager">
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to galleries
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">{gallery.name}</h1>
          {gallery.description && (
            <p className="text-muted-foreground text-sm">
              {gallery.description}
            </p>
          )}
        </div>
      </div>

      <GalleryEditor
        gallery={gallery}
        initialPickerFiles={pickerFiles}
        initialPickerTotal={pickerTotal}
        pickerPageSize={PICKER_PAGE_SIZE}
        isAdmin={isAdmin}
      />
    </div>
  );
}
