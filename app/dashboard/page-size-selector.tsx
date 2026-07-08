"use client";

import { useTranslations } from "@/components/i18n-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100] as const;
export type DashboardPageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export function PageSizeSelector({
  disabled,
  pageSize,
  onChange,
}: {
  disabled?: boolean;
  pageSize: number;
  onChange: (size: number) => void;
}) {
  const t = useTranslations();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {t("dashboard.pagination.rowsPerPage")}
      </span>
      <Select
        disabled={disabled}
        value={String(pageSize)}
        onValueChange={(v) => onChange(Number(v))}
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZE_OPTIONS.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
