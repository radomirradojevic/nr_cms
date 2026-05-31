"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentTable, type ContentRow } from "./content-table";
import type { Role } from "@/lib/roles";

type AllowedPageSize = 10 | 20 | 30;

export type CategoryOption = { id: string; name: string };

type Props = {
  currentUserId: string;
  currentUserRoles: Role[];
  pageCategories: CategoryOption[];
  blogCategories: CategoryOption[];
};

export function ContentTableContainer({
  currentUserId,
  currentUserRoles,
  pageCategories,
  blogCategories,
}: Props) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [type, setType] = useState<
    "all" | "page" | "blog_post" | "hero_slider"
  >("all");
  const [status, setStatus] = useState<
    "all" | "published" | "unpublished" | "archived"
  >("all");
  const [categoryId, setCategoryId] = useState<string>("all");
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

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(safePage),
        pageSize: String(pageSize),
      });
      if (debouncedQuery) params.set("search", debouncedQuery);
      if (type !== "all") params.set("type", type);
      if (status !== "all") params.set("status", status);
      if (categoryId !== "all") params.set("category", categoryId);
      const res = await fetch(`/api/content?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [safePage, pageSize, debouncedQuery, type, status, categoryId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchRows();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchRows]);

  // Reset filters that depend on type
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setCategoryId("all");
      setPage(1);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [type]);

  const availableCategories =
    type === "page"
      ? pageCategories
      : type === "hero_slider"
        ? pageCategories
        : type === "blog_post"
          ? blogCategories
          : [...pageCategories, ...blogCategories];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, slug, meta…"
          className="max-w-xs"
        />
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="page">Page</SelectItem>
            <SelectItem value="blog_post">Blog post</SelectItem>
            <SelectItem value="hero_slider">Hero Slider</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as typeof status);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="unpublished">Unpublished</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={categoryId}
          onValueChange={(v) => {
            setCategoryId(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {availableCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      />
    </div>
  );
}
