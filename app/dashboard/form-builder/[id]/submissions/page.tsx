import { redirect, notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { getFormById, listSubmissions } from "@/data/forms";
import { Button } from "@/components/ui/button";
import { getTranslations } from "@/lib/i18n/server";
import { SubmissionsList } from "./submissions-list";

const PAGE_SIZE = 10;

export default async function FormSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { userId } = await auth();
  if (!userId) redirect("/");
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) redirect("/dashboard");
  const t = await getTranslations("backend");

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
            <ArrowLeft className="mr-1 h-4 w-4" />{" "}
            {t("dashboard.forms.backToForm")}
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            {t("dashboard.forms.submissionsTitle", { name: detail.form.name })}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t.plural("dashboard.forms.totalSubmissions", initial.total)}
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
