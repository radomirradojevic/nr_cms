"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type SearchContentType = "blog_post" | "page";

type SearchResult = {
  id: string;
  title: string;
  url: string;
  contentType: SearchContentType;
  snippet: string;
};

type SiteSearchProps = {
  label: string;
  placeholder: string;
  contentTypes: SearchContentType[];
  className?: string;
  inputClassName?: string;
  resultsAlign?: "left" | "right";
};

function typeLabel(type: SearchContentType): string {
  return type === "blog_post" ? "Blog post" : "Page";
}

export function SiteSearch({
  label,
  placeholder,
  contentTypes,
  className,
  inputClassName,
  resultsAlign = "left",
}: SiteSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const typesParam = useMemo(
    () => Array.from(new Set(contentTypes)).join(","),
    [contentTypes],
  );
  const canSearch = query.trim().length >= 2 && typesParam.length > 0;

  useEffect(() => {
    abortRef.current?.abort();

    if (!canSearch) {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const timeout = window.setTimeout(async () => {
      const params = new URLSearchParams({
        q: query.trim(),
        types: typesParam,
        limit: "10",
      });

      try {
        setLoading(true);
        const response = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Search failed");
        const data = (await response.json()) as {
          results?: SearchResult[];
        };
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 280);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [canSearch, query, typesParam]);

  return (
    <form
      action="/search"
      className={cn("relative hidden items-center lg:flex", className)}
      role="search"
      aria-label={label}
      onFocus={() => setOpen(true)}
      onBlur={() => {
        window.setTimeout(() => setOpen(false), 120);
      }}
    >
      <input type="hidden" name="types" value={typesParam} />
      <input
        type="search"
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            event.currentTarget.blur();
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(
          "h-8 w-40 rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          inputClassName,
        )}
      />
      {open && canSearch && (
        <div
          className={cn(
            "absolute top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-popover text-left text-popover-foreground shadow-lg",
            resultsAlign === "right" ? "right-0" : "left-0",
          )}
          onMouseDown={(event) => event.preventDefault()}
        >
          {loading && results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-96 overflow-y-auto py-1">
              {results.map((result) => (
                <Link
                  key={result.id}
                  href={result.url}
                  onClick={() => setOpen(false)}
                  className="group block px-3 py-2 text-sm outline-none transition-colors hover:!bg-[var(--nav-hover-bg)] hover:!text-[var(--nav-hover-foreground)] focus-visible:!bg-[var(--nav-hover-bg)] focus-visible:!text-[var(--nav-hover-foreground)]"
                >
                  <span className="block text-xs font-medium text-muted-foreground transition-colors group-hover:text-[var(--nav-hover-foreground)] group-focus-visible:text-[var(--nav-hover-foreground)]">
                    {typeLabel(result.contentType)}
                  </span>
                  <span className="mt-0.5 block font-medium">
                    {result.title}
                  </span>
                  {result.snippet && (
                    <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground transition-colors group-hover:text-[var(--nav-hover-foreground)] group-hover:opacity-90 group-focus-visible:text-[var(--nav-hover-foreground)] group-focus-visible:opacity-90">
                      {result.snippet}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No results found.
            </div>
          )}
        </div>
      )}
    </form>
  );
}
