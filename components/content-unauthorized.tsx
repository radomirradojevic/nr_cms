import { ShieldAlert } from "lucide-react";
import { UNAUTHORIZED_MESSAGE } from "@/lib/content-visibility";

export function ContentUnauthorized() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <main className="w-full max-w-xl rounded-lg border bg-card p-8 text-center">
        <ShieldAlert
          className="mx-auto mb-4 h-10 w-10 text-muted-foreground"
          aria-hidden="true"
        />
        <h1 className="text-xl font-semibold tracking-tight">
          Access restricted
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {UNAUTHORIZED_MESSAGE}
        </p>
      </main>
    </div>
  );
}
