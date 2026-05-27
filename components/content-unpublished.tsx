import Link from "next/link";
import { FileClock } from "lucide-react";
import { Button } from "@/components/ui/button";

type ContentUnpublishedProps = {
  editHref: string;
};

export function ContentUnpublished({ editHref }: ContentUnpublishedProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <main className="w-full max-w-xl rounded-lg border bg-card p-8 text-center">
        <FileClock
          className="mx-auto mb-4 h-10 w-10 text-muted-foreground"
          aria-hidden="true"
        />
        <h1 className="text-xl font-semibold tracking-tight">
          This content is not published yet
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          It will become visible on the public site once it has been published.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild variant="outline">
            <Link href={editHref}>Open in dashboard</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
