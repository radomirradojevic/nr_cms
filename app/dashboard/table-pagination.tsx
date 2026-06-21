"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { PageSizeSelector } from "./page-size-selector";

type TablePaginationProps = {
  disabled?: boolean;
  label?: ReactNode;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function TablePagination({
  disabled,
  label,
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  total,
  totalPages,
}: TablePaginationProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        {label ?? (
          <>
            Page {page} of {totalPages} &mdash; {total} total
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <PageSizeSelector
          disabled={disabled}
          pageSize={pageSize}
          onChange={onPageSizeChange}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
