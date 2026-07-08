import Link from "next/link";
import { FileClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTranslations } from "@/lib/i18n/server";

type ContentUnpublishedProps = {
  editHref: string;
};

export async function ContentUnpublished({
  editHref,
}: ContentUnpublishedProps) {
  const t = await getTranslations("frontend");

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <main className="w-full max-w-xl rounded-lg border bg-card p-8 text-center">
        <FileClock
          className="mx-auto mb-4 h-10 w-10 text-muted-foreground"
          aria-hidden="true"
        />
        <h1 className="text-xl font-semibold tracking-tight">
          {t("public.errors.unpublished.title")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("public.errors.unpublished.description")}
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild variant="outline">
            <Link href={editHref}>
              {t("public.errors.unpublished.openInDashboard")}
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
