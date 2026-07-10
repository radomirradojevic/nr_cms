import { redirect, notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowLeft, Inbox } from "lucide-react";

import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { getFormById } from "@/data/forms";
import { Button } from "@/components/ui/button";
import { FormEditLockProvider } from "@/components/form-edit-lock-provider";
import { getTranslations } from "@/lib/i18n/server";
import { FormEditor } from "./form-editor";

export default async function FormEditPage({
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/form-builder">
              <ArrowLeft className="mr-1 h-4 w-4" />{" "}
              {t("dashboard.forms.backToForms")}
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{detail.form.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("dashboard.common.table.slug")}:{" "}
              <code className="text-xs">{detail.form.slug}</code> ·{" "}
              {t("dashboard.common.table.status")}:{" "}
              {t(`dashboard.forms.status.${detail.form.status}`)}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/form-builder/${id}/submissions`}>
            <Inbox className="mr-2 h-4 w-4" />{" "}
            {t("dashboard.forms.submissions")}
          </Link>
        </Button>
      </div>

      <FormEditLockProvider formId={id} currentUserId={userId}>
        <FormEditor
          form={detail.form}
          fields={detail.fields}
          settings={detail.settings}
        />
      </FormEditLockProvider>
    </div>
  );
}
