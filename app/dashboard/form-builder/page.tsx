import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";

import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { listForms } from "@/data/forms";
import { FormsList } from "./forms-list";
import { CreateFormDialog } from "./create-form-dialog";

const PAGE_SIZE = 20;

export default async function FormBuilderPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) redirect("/dashboard");

  const client = await clerkClient();

  const [{ rows, total }, allUsersRes] = await Promise.all([
    listForms({ limit: PAGE_SIZE, offset: 0 }),
    client.users.getUserList({ limit: 100 }),
  ]);

  // Build a name map for creator display
  const nameMap = new Map<string, string>(
    allUsersRes.data.map((u) => [
      u.id,
      u.fullName || u.username || u.primaryEmailAddress?.emailAddress || u.id,
    ]),
  );

  // Build admins list (users with "admin" role)
  const admins = allUsersRes.data
    .filter((u) => {
      const r = getRoles(u.publicMetadata);
      return hasRole(r, "admin");
    })
    .map((u) => ({
      id: u.id,
      name:
        u.fullName || u.username || u.primaryEmailAddress?.emailAddress || u.id,
    }));

  const enrichedRows = rows.map((r) => ({
    ...r,
    createdByName: r.createdBy ? (nameMap.get(r.createdBy) ?? null) : null,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Form Builder</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Build reusable forms and embed them in pages or blog posts. Admin
            access only.
          </p>
        </div>
        <CreateFormDialog />
      </div>

      <FormsList
        initialRows={enrichedRows}
        initialTotal={total}
        pageSize={PAGE_SIZE}
        admins={admins}
      />
    </div>
  );
}
