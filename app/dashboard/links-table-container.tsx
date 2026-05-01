"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { LinksTable } from "@/app/dashboard/links-table";

type LinkRow = {
  id: number;
  shortCode: string;
  originalUrl: string;
  createdAt: string;
  updatedAt: string;
};

const ALLOWED_PAGE_SIZES = [10, 20, 30] as const;
type AllowedPageSize = (typeof ALLOWED_PAGE_SIZES)[number];

export function LinksTableContainer() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AllowedPageSize>(10);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input by 300ms
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

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(safePage),
        pageSize: String(pageSize),
      });
      if (debouncedQuery) params.set("search", debouncedQuery);
      const res = await fetch(`/api/links?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [safePage, pageSize, debouncedQuery]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  function handlePageSizeChange(size: AllowedPageSize) {
    setPageSize(size);
    setPage(1);
  }

  return (
    <div className="container mx-auto py-8">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by short code or URL…"
        className="max-w-sm mb-4"
      />
      <LinksTable
        links={links.map((l) => ({ ...l, createdAt: new Date(l.createdAt) }))}
        total={total}
        loading={loading}
        safePage={safePage}
        totalPages={totalPages}
        query={debouncedQuery}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        onMutated={fetchLinks}
      />
    </div>
  );
}
