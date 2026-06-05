import Link from "next/link";
import { Home, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="flex min-h-[calc(100svh-var(--header-h,0px)-var(--footer-min-h,0px))] items-center justify-center px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-xl rounded-lg border border-border/70 bg-card/90 p-6 text-center text-card-foreground shadow-lg backdrop-blur sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg border border-border/70 bg-background/75 text-lg font-semibold shadow-sm">
          404
        </div>
        <p className="mt-5 text-sm font-medium text-muted-foreground">
          Page not found
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-balance sm:text-4xl">
          This page is not available.
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
          The link may be wrong, the page may be unpublished, or the content may
          have moved.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/">
              <Home aria-hidden className="size-4" />
              Home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/search">
              <Search aria-hidden className="size-4" />
              Search site
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
