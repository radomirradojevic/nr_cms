import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { listFiles, getDistinctUploaderIds } from "@/data/files";
import { getGlobalSettings } from "@/data/global-settings";
import { getStorageProviderName } from "@/lib/file-storage";
import { FileManager } from "./file-manager";

export type UploaderInfo = { id: string; name: string };

const ALLOWED_ROLES = ["admin", "publisher", "author"] as const;
const PAGE_SIZE = 60;

export default async function FileManagerPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!roles.some((r) => (ALLOWED_ROLES as readonly string[]).includes(r))) {
    redirect("/dashboard");
  }
  const isAdmin = hasRole(roles, "admin");

  const [{ rows, total }, settings, storageProvider] = await Promise.all([
    listFiles({
      caller: { userId, isAdmin },
      limit: PAGE_SIZE,
      offset: 0,
    }),
    getGlobalSettings(),
    getStorageProviderName(),
  ]);

  // Build uploader name map for display + admin filter
  let uploaders: UploaderInfo[] = [];
  const client = await clerkClient();
  if (isAdmin) {
    const uploaderIds = await getDistinctUploaderIds();
    if (uploaderIds.length > 0) {
      const clerkUsers = await Promise.all(
        uploaderIds.map((id) => client.users.getUser(id).catch(() => null)),
      );
      uploaders = clerkUsers.filter(Boolean).map((u) => ({
        id: u!.id,
        name:
          u!.fullName ||
          u!.username ||
          u!.primaryEmailAddress?.emailAddress ||
          u!.id,
      }));
    }
  } else {
    uploaders = [
      {
        id: userId,
        name:
          user?.fullName ||
          user?.username ||
          user?.primaryEmailAddress?.emailAddress ||
          userId,
      },
    ];
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">File Manager</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload and manage images, videos, and documents.
        </p>
      </div>

      <FileManager
        initialFiles={rows}
        initialTotal={total}
        pageSize={PAGE_SIZE}
        isAdmin={isAdmin}
        uploaders={uploaders}
        maxFileSize={settings.maxUploadSizeBytes}
        maxBatchSize={settings.maxBatchUploadSizeBytes}
        storageProvider={storageProvider}
      />
    </div>
  );
}
