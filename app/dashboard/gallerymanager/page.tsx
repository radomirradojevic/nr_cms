import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";

import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { listGalleries, getDistinctCreatorIds } from "@/data/galleries";
import { getTranslations } from "@/lib/i18n/server";
import { GalleryList } from "./gallery-list";
import { CreateGalleryDialog } from "./create-gallery-dialog";

export type CreatorInfo = { id: string; name: string };

const ALLOWED_ROLES = ["admin", "publisher", "author"] as const;
const PAGE_SIZE = 24;

export default async function GalleryManagerPage() {
  const t = await getTranslations("backend");
  const { userId } = await auth();
  if (!userId) redirect("/");

  const user = await getOptionalCurrentUser();
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

  let creators: CreatorInfo[] = [];
  if (isAdmin) {
    const creatorIds = await getDistinctCreatorIds();
    if (creatorIds.length > 0) {
      const client = await clerkClient();
      const clerkUsers = await Promise.all(
        creatorIds.map((id) => client.users.getUser(id).catch(() => null)),
      );
      creators = clerkUsers.filter(Boolean).map((u) => ({
        id: u!.id,
        name:
          u!.fullName ||
          u!.username ||
          u!.primaryEmailAddress?.emailAddress ||
          u!.id,
      }));
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {t("dashboard.galleries.title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("dashboard.galleries.description")}
          </p>
        </div>
        <CreateGalleryDialog />
      </div>

      <GalleryList
        initialRows={rows}
        initialTotal={total}
        pageSize={PAGE_SIZE}
        isAdmin={isAdmin}
        creators={creators}
      />
    </div>
  );
}
