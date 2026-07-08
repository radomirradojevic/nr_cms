"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useTranslations } from "@/components/i18n-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/app/dashboard/table-pagination";
import { useRegionalSettings } from "@/components/regional-settings-provider";
import type { MenuCreatorInfo, MenuListItem } from "@/data/top-menu";
import { fetchMenusList } from "../top-menu/actions";
import { MenuRowActions } from "./menu-row-actions";

type Props = {
  initialRows: MenuListItem[];
  initialTotal: number;
  pageSize: number;
  creators: MenuCreatorInfo[];
  selectedNavigationMenuId: string | null;
};

export function MenusList({
  initialRows,
  initialTotal,
  pageSize,
  creators,
  selectedNavigationMenuId,
}: Props) {
  const t = useTranslations();
  const { formatDate, formatDateTime } = useRegionalSettings();
  const [rows, setRows] = useState<MenuListItem[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const [search, setSearch] = useState("");
  const [creator, setCreator] = useState("all");
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runFetch(1), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, creator]);

  function runFetch(nextPage: number, nextPageSize = currentPageSize) {
    startTransition(async () => {
      const result = await fetchMenusList({
        search: search || undefined,
        createdBy: creator === "all" ? undefined : creator,
        limit: nextPageSize,
        offset: (nextPage - 1) * nextPageSize,
      });
      if ("error" in result) return;
      setTotal(result.total);
      setRows(result.rows);
      setPage(nextPage);
      setCurrentPageSize(nextPageSize);
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / currentPageSize));
  const safePage = Math.min(page, totalPages);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("dashboard.menus.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        {creators.length > 0 && (
          <Select value={creator} onValueChange={setCreator}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("dashboard.filters.allCreators")}
              </SelectItem>
              {creators.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("dashboard.common.table.name")}</TableHead>
            <TableHead className="w-56">
              {t("dashboard.common.table.creator")}
            </TableHead>
            <TableHead className="w-32">
              {t("dashboard.common.table.items")}
            </TableHead>
            <TableHead className="w-32">
              {t("dashboard.common.table.nested")}
            </TableHead>
            <TableHead className="w-56">
              {t("dashboard.common.table.updated")}
            </TableHead>
            <TableHead className="w-72 text-right">
              {t("dashboard.common.table.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pending && rows.length === 0 ? (
            Array.from({ length: 3 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell colSpan={6}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="py-10 text-center text-muted-foreground"
              >
                {t("dashboard.menus.noMenus")}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((menu) => (
              <TableRow key={menu.id}>
                <TableCell>
                  <Link
                    href={`/dashboard/menus/${menu.id}`}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {menu.name}
                  </Link>
                  {selectedNavigationMenuId === menu.id && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {t("dashboard.menus.headerBadge")}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  <div>{menu.creatorName ?? "-"}</div>
                  <div className="mt-0.5">{formatDate(menu.createdAt)}</div>
                </TableCell>
                <TableCell>{menu.totalItems}</TableCell>
                <TableCell>{menu.nestedItems}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  <div>{formatDateTime(menu.updatedAt)}</div>
                  <div className="mt-0.5">
                    {t("dashboard.common.meta.by", {
                      name:
                        menu.updatedByName ??
                        t("dashboard.common.meta.unknown"),
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <MenuRowActions
                    menu={{
                      id: menu.id,
                      name: menu.name,
                      createdBy: menu.createdBy,
                      creatorName: menu.creatorName,
                    }}
                    isHeaderMenu={selectedNavigationMenuId === menu.id}
                    onChanged={() => runFetch(safePage)}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <TablePagination
        disabled={pending}
        page={safePage}
        pageSize={currentPageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={(nextPage) => runFetch(nextPage)}
        onPageSizeChange={(nextPageSize) => runFetch(1, nextPageSize)}
      />
    </div>
  );
}
