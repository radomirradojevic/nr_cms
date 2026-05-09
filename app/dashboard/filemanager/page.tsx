import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getRoles, hasRole } from "@/lib/roles";
import { listFiles } from "@/data/files";
import { FileManager } from "./file-manager";

const ALLOWED_ROLES = ["admin", "publisher", "author"] as const;
const PAGE_SIZE = 60;

export default async function FileManagerPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const user = await currentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!roles.some((r) => (ALLOWED_ROLES as readonly string[]).includes(r))) {
    redirect("/dashboard");
  }
  const isAdmin = hasRole(roles, "admin");

  const { rows, total } = await listFiles({
    caller: { userId, isAdmin },
    limit: PAGE_SIZE,
    offset: 0,
  });

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
      />
    </div>
  );
}
