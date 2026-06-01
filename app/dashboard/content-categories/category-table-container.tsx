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
import { CategoryTable } from "./category-table";
import type { ContentCategoryAuthorInfo } from "@/data/content-categories";

type CategoryRow = {
  id: string;
  name: string;
  contentType: string;
  createdBy: string | null;
  createdByName: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
  created: string;
  updated: string;
  itemCount: number;
};

type AllowedPageSize = 10 | 20 | 30;

type Props = {
  contentType: "page" | "blog_post";
  authors: ContentCategoryAuthorInfo[];
};

export function CategoryTableContainer({ contentType, authors }: Props) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [authorId, setAuthorId] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AllowedPageSize>(10);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
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

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: contentType,
        page: String(safePage),
        pageSize: String(pageSize),
      });
      if (debouncedQuery) params.set("search", debouncedQuery);
      if (authorId !== "all") params.set("author", authorId);
      const res = await fetch(`/api/content-categories?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [contentType, safePage, pageSize, debouncedQuery, authorId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchCategories();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchCategories]);

  function handlePageSizeChange(size: AllowedPageSize) {
    setPageSize(size);
    setPage(1);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          className="max-w-xs"
        />
        {authors.length > 0 && (
          <Select
            value={authorId}
            onValueChange={(value) => {
              setAuthorId(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Author" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All authors</SelectItem>
              {authors.map((author) => (
                <SelectItem key={author.id} value={author.id}>
                  {author.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <CategoryTable
        contentType={contentType}
        categories={categories}
        total={total}
        loading={loading}
        safePage={safePage}
        totalPages={totalPages}
        query={debouncedQuery}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        onMutated={fetchCategories}
      />
    </div>
  );
}
