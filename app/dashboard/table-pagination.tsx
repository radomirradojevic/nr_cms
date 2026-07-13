"use client";

import type { ReactNode } from "react";

import { useTranslations } from "@/components/i18n-provider";
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
  const t = useTranslations();

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        {label ?? (
          <>
            {t("dashboard.pagination.pageOfTotal", {
              page,
              totalPages,
              total,
            })}
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
            {t("dashboard.pagination.previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            {t("dashboard.pagination.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
