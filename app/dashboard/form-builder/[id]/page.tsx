import { redirect, notFound } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowLeft, Inbox } from "lucide-react";

import { getRoles, hasRole } from "@/lib/roles";
import { getFormById } from "@/data/forms";
import { Button } from "@/components/ui/button";
import { FormEditor } from "./form-editor";

export default async function FormEditPage({
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/form-builder">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{detail.form.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Slug: <code className="text-xs">{detail.form.slug}</code> ·
              Status: {detail.form.status}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/form-builder/${id}/submissions`}>
            <Inbox className="mr-2 h-4 w-4" /> Submissions
          </Link>
        </Button>
      </div>

      <FormEditor
        form={detail.form}
        fields={detail.fields}
        settings={detail.settings}
      />
    </div>
  );
}
