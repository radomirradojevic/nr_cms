import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";

import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { getDistinctFormCreatorIds, listForms } from "@/data/forms";
import { listActiveLocksForFormIds } from "@/data/form-locks";
import { FormsList } from "./forms-list";
import { CreateFormDialog } from "./create-form-dialog";

const PAGE_SIZE = 20;

type FormCreatorInfo = {
  id: string;
  name: string;
};

export default async function FormBuilderPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) redirect("/dashboard");

  const [{ rows, total }, distinctCreatorIds] = await Promise.all([
    listForms({ limit: PAGE_SIZE, offset: 0 }),
    getDistinctFormCreatorIds(),
  ]);
  const activeLocks = await listActiveLocksForFormIds(rows.map((r) => r.id));

  const creatorIds = [...new Set(distinctCreatorIds)];
  const userIdsToResolve = [
    ...new Set([
      ...creatorIds,
      ...rows.map((r) => r.createdBy).filter(Boolean),
      ...rows.map((r) => r.updatedBy).filter(Boolean),
    ]),
  ];
  const nameMap = new Map<string, string>();
  if (userIdsToResolve.length > 0) {
    const client = await clerkClient();
    await Promise.all(
      userIdsToResolve.map(async (id) => {
        const creator = await client.users.getUser(id).catch(() => null);
        if (!creator) return;
        nameMap.set(
          id,
          creator.fullName ||
            creator.username ||
            creator.primaryEmailAddress?.emailAddress ||
            id,
        );
      }),
    );
  }

  const enrichedRows = rows.map((r) => ({
    ...r,
    createdByName: r.createdBy ? (nameMap.get(r.createdBy) ?? null) : null,
    updatedByName: r.updatedBy ? (nameMap.get(r.updatedBy) ?? null) : null,
    editLock: activeLocks.get(r.id) ?? null,
  }));
  const creators: FormCreatorInfo[] = creatorIds.map((id) => ({
    id,
    name: nameMap.get(id) ?? id,
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
        creators={creators}
      />
    </div>
  );
}
