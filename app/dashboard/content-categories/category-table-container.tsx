"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { CategoryTable } from "./category-table";

type CategoryRow = {
  id: string;
  name: string;
  contentType: string;
  createdBy: string | null;
  createdByName: string | null;
  itemCount: number;
};

type AdminUser = { id: string; name: string };

type AllowedPageSize = 10 | 20 | 30;

type Props = {
  contentType: "page" | "blog_post";
};

export function CategoryTableContainer({ contentType }: Props) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AllowedPageSize>(10);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminUser[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/admins")
      .then((r) => r.json())
      .then((data) => {
        if (data.admins) setAdmins(data.admins);
      })
      .catch(() => {});
  }, []);

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
      const res = await fetch(`/api/content-categories?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [contentType, safePage, pageSize, debouncedQuery]);

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
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name…"
        className="max-w-xs"
      />
      <CategoryTable
        contentType={contentType}
        categories={categories}
        admins={admins}
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
