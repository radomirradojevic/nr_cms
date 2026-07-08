import type { Metadata } from "next";
import Link from "next/link";

import { searchPublishedContent, type ContentType } from "@/data/content";
import { getTranslations } from "@/lib/i18n/server";
import type { TranslateFn } from "@/lib/i18n/translate";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles } from "@/lib/roles";

type Props = {
  searchParams: Promise<{
    q?: string | string[];
    types?: string | string[];
  }>;
};

const VALID_TYPES: ContentType[] = ["blog_post", "page"];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("frontend");

  return {
    title: t("search.title"),
  };
}

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function parseTypes(value: string | string[] | undefined): ContentType[] {
  const raw = firstParam(value);
  if (!raw) return VALID_TYPES;
  const types = raw
    .split(",")
    .map((type) => type.trim())
    .filter((type): type is ContentType =>
      VALID_TYPES.includes(type as ContentType),
    );
  return Array.from(new Set(types));
}

function typeLabel(type: ContentType, t: TranslateFn): string {
  return type === "blog_post"
    ? t("search.resultType.blogPost")
    : t("search.resultType.page");
}

export default async function SearchPage({ searchParams }: Props) {
  const t = await getTranslations("frontend");
  const params = await searchParams;
  const query = firstParam(params.q).trim();
  const contentTypes = parseTypes(params.types);

  const me = await getOptionalCurrentUser(true);
  const viewerRoles = me ? getRoles(me.publicMetadata) : null;
  const { rows, total } =
    query.length > 0 && contentTypes.length > 0
      ? await searchPublishedContent({
          query,
          contentTypes,
          limit: 30,
          viewerRoles,
        })
      : { rows: [], total: 0 };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-normal">
          {t("search.title")}
        </h1>
        {query ? (
          <p className="text-sm text-muted-foreground">
            {t("search.resultsFor", {
              query,
              results: t.plural("search.results", total, { count: total }),
            })}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("search.enterTerm")}
          </p>
        )}
      </div>

      <div className="mt-8 space-y-5">
        {rows.map((result) => (
          <article key={result.id} className="border-b pb-5">
            <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
              {typeLabel(result.contentType, t)}
            </div>
            <h2 className="text-xl font-semibold tracking-normal">
              <Link href={result.url} className="hover:underline">
                {result.title}
              </Link>
            </h2>
            {result.snippet && (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {result.snippet}
              </p>
            )}
            <Link
              href={result.url}
              className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
            >
              {t("search.readMore")}
            </Link>
          </article>
        ))}
        {query && rows.length === 0 && (
          <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            {t("search.noMatchingContent")}
          </p>
        )}
      </div>
    </main>
  );
}
