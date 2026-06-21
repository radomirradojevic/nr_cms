"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

import { TablePagination } from "@/app/dashboard/table-pagination";

type UsersTablePaginationProps = {
  currentPage: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export function UsersTablePagination({
  currentPage,
  perPage,
  total,
  totalPages,
}: UsersTablePaginationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const updateQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "1") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const query = params.toString();
      startTransition(() => {
        router.push(`${pathname}${query ? `?${query}` : ""}`);
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <TablePagination
      disabled={pending}
      page={currentPage}
      pageSize={perPage}
      total={total}
      totalPages={totalPages}
      onPageChange={(page) => updateQuery({ page: String(page) })}
      onPageSizeChange={(pageSize) =>
        updateQuery({
          page: null,
          perPage: pageSize === 10 ? null : String(pageSize),
        })
      }
    />
  );
}
