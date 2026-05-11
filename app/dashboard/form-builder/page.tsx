import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";

import { getRoles, hasRole } from "@/lib/roles";
import { listForms } from "@/data/forms";
import { FormsList } from "./forms-list";
import { CreateFormDialog } from "./create-form-dialog";

const PAGE_SIZE = 20;

export default async function FormBuilderPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");
  const user = await currentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) redirect("/dashboard");

  const { rows, total } = await listForms({
    limit: PAGE_SIZE,
    offset: 0,
  });

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

      <FormsList initialRows={rows} initialTotal={total} pageSize={PAGE_SIZE} />
    </div>
  );
}
