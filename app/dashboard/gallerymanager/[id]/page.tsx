import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ChevronLeft, ImageIcon, LockKeyhole } from "lucide-react";

import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { getGalleryById, type GalleryDetail } from "@/data/galleries";
import { listFiles } from "@/data/files";
import {
  getWebshopGalleryProductHref,
  isLockedGallery,
  isWebshopGalleryOrigin,
} from "@/lib/gallery-origin";
import { resolveWebshopAddonState } from "@/lib/webshop-addon/license";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  if (isLockedGallery(gallery)) {
    const addonState = await resolveWebshopAddonState();
    return (
      <LockedGalleryView addonStatus={addonState.status} gallery={gallery} />
    );
  }

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

function LockedGalleryView({
  addonStatus,
  gallery,
}: {
  addonStatus: Awaited<ReturnType<typeof resolveWebshopAddonState>>["status"];
  gallery: GalleryDetail;
}) {
  const productHref = getWebshopGalleryProductHref(gallery);
  const canOpenProduct =
    Boolean(productHref) &&
    (addonStatus === "ready" || addonStatus === "license_expired");
  const webshopGallery = isWebshopGalleryOrigin(gallery);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/dashboard/gallerymanager">
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to galleries
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{gallery.name}</h1>
            {webshopGallery ? (
              <Badge variant="secondary">Webshop gallery</Badge>
            ) : null}
            <Badge variant="outline">Read-only</Badge>
          </div>
          {gallery.description && (
            <p className="text-muted-foreground text-sm">
              {gallery.description}
            </p>
          )}
        </div>
        {canOpenProduct && productHref ? (
          <Button asChild>
            <Link href={productHref}>
              <LockKeyhole className="h-4 w-4" />
              Product media
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>
              This gallery is managed outside the public Gallery Manager.
            </div>
            {!canOpenProduct ? (
              <div>
                Webshop editor is unavailable for this deployment state:{" "}
                {addonStatus.replaceAll("_", " ")}.
              </div>
            ) : addonStatus === "license_expired" ? (
              <div>Existing product media can be edited while expired.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {gallery.images.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          <ImageIcon className="mx-auto mb-3 h-8 w-8" />
          No images are linked to this gallery.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {gallery.images.map((image) => (
            <div
              className="overflow-hidden rounded-lg border"
              key={image.fileId}
            >
              <div className="aspect-video bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={
                    image.file.alt ?? image.file.title ?? image.file.filename
                  }
                  className="h-full w-full object-cover"
                  src={`/api/files/${image.fileId}`}
                />
              </div>
              <div className="truncate p-3 text-sm">
                {image.file.title ?? image.file.filename}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
