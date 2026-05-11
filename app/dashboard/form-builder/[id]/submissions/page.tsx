import { redirect, notFound } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getRoles, hasRole } from "@/lib/roles";
import { getFormById, listSubmissions } from "@/data/forms";
import { Button } from "@/components/ui/button";
import { SubmissionsList } from "./submissions-list";

const PAGE_SIZE = 25;

export default async function FormSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { userId } = await auth();
  if (!userId) redirect("/");
  const user = await currentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) redirect("/dashboard");

  const detail = await getFormById(id);
  if (!detail) notFound();

  const initial = await listSubmissions({
    formId: id,
    limit: PAGE_SIZE,
    offset: 0,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/form-builder/${id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to form
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            {detail.form.name} — Submissions
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {initial.total} total submission{initial.total === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <SubmissionsList
        formId={id}
        fields={detail.fields}
        initialRows={initial.rows}
        initialTotal={initial.total}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
