import { ShieldAlert } from "lucide-react";
import { getTranslations } from "@/lib/i18n/server";

export async function ContentUnauthorized() {
  const t = await getTranslations("frontend");

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <main className="w-full max-w-xl rounded-lg border bg-card p-8 text-center">
        <ShieldAlert
          className="mx-auto mb-4 h-10 w-10 text-muted-foreground"
          aria-hidden="true"
        />
        <h1 className="text-xl font-semibold tracking-tight">
          {t("public.errors.accessRestricted.title")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("public.errors.accessRestricted.description")}
        </p>
      </main>
    </div>
  );
}
