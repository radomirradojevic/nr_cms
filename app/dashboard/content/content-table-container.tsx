"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "@/components/i18n-provider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentTable, type ContentRow } from "./content-table";
import type { ContentAuthorInfo } from "@/data/content";
import {
  CONTENT_STATUSES,
  getContentStatusLabelKey,
  type ContentStatus,
} from "@/lib/content-status";
import type { Role } from "@/lib/roles";
import {
  CMS_CONTENT_TYPES,
  getContentTypeLabelKey,
  type ContentType,
} from "@/lib/content-types";

type AllowedPageSize = 10 | 20 | 30 | 50 | 100;

export type CategoryOption = { id: string; name: string };

type Props = {
  currentUserId: string;
  currentUserRoles: Role[];
  pageCategories: CategoryOption[];
  blogCategories: CategoryOption[];
  webshopCategories: CategoryOption[];
  authors: ContentAuthorInfo[];
};

export function ContentTableContainer({
  currentUserId,
  currentUserRoles,
  pageCategories,
  blogCategories,
  webshopCategories,
  authors,
}: Props) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [type, setType] = useState<"all" | ContentType>("all");
  const [status, setStatus] = useState<"all" | ContentStatus>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [authorId, setAuthorId] = useState<string>("all");
  const [view, setView] = useState<"content" | "deleted">("content");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AllowedPageSize>(10);
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const fetchRows = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(safePage),
          pageSize: String(pageSize),
        });
        if (debouncedQuery) params.set("search", debouncedQuery);
        if (type !== "all") params.set("type", type);
        if (view === "deleted") params.set("view", "deleted");
        if (view === "content" && status !== "all") {
          params.set("status", status);
        }
        if (categoryId !== "all") params.set("category", categoryId);
        if (authorId !== "all") params.set("author", authorId);
        const res = await fetch(`/api/content?${params.toString()}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setRows(data.rows);
          setTotal(data.total);
        }
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [
      safePage,
      pageSize,
      debouncedQuery,
      type,
      status,
      categoryId,
      authorId,
      view,
    ],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchRows();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchRows]);

  useEffect(() => {
    const refreshLocks = () => {
      void fetchRows({ silent: true });
    };
    window.addEventListener("focus", refreshLocks);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshLocks();
    }, 15000);
    return () => {
      window.removeEventListener("focus", refreshLocks);
      window.clearInterval(intervalId);
    };
  }, [fetchRows]);

  // Reset filters that depend on type
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setCategoryId("all");
      setPage(1);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [type]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [view]);

  const availableCategories =
    type === "page"
      ? pageCategories
      : type === "hero_slider"
        ? pageCategories
        : type === "webshop"
          ? webshopCategories
          : type === "blog_post"
            ? blogCategories
            : [...pageCategories, ...blogCategories, ...webshopCategories];

  return (
    <div className="space-y-3">
      <Tabs
        value={view}
        onValueChange={(value) => setView(value as typeof view)}
      >
        <TabsList>
          <TabsTrigger value="content">
            {t("dashboard.content.tabs.content")}
          </TabsTrigger>
          <TabsTrigger value="deleted">
            {t("dashboard.content.tabs.deleted")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("dashboard.content.searchPlaceholder")}
          className="max-w-xs"
        />
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("dashboard.filters.type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("dashboard.filters.allTypes")}
            </SelectItem>
            {CMS_CONTENT_TYPES.map((option) => (
              <SelectItem key={option} value={option}>
                {t(getContentTypeLabelKey(option))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {view === "content" && (
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as typeof status);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("dashboard.filters.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("dashboard.filters.allStatuses")}
              </SelectItem>
              {CONTENT_STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(getContentStatusLabelKey(option))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={categoryId}
          onValueChange={(v) => {
            setCategoryId(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("dashboard.filters.category")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("dashboard.filters.allCategories")}
            </SelectItem>
            {availableCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {authors.length > 0 && (
          <Select
            value={authorId}
            onValueChange={(v) => {
              setAuthorId(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("dashboard.filters.author")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("dashboard.filters.allAuthors")}
              </SelectItem>
              {authors.map((author) => (
                <SelectItem key={author.id} value={author.id}>
                  {author.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <ContentTable
        rows={rows}
        total={total}
        loading={loading}
        safePage={safePage}
        totalPages={totalPages}
        pageSize={pageSize}
        currentUserId={currentUserId}
        currentUserRoles={currentUserRoles}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        onMutated={fetchRows}
        deletedView={view === "deleted"}
      />
    </div>
  );
}
