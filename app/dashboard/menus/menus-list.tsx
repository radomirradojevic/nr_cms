"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const { formatDate, formatDateTime } = useRegionalSettings();
  const [rows, setRows] = useState<MenuListItem[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(initialRows.length);
  const [search, setSearch] = useState("");
  const [creator, setCreator] = useState("all");
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runFetch(0, true), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, creator]);

  function runFetch(nextOffset: number, replace: boolean) {
    startTransition(async () => {
      const result = await fetchMenusList({
        search: search || undefined,
        createdBy: creator === "all" ? undefined : creator,
        limit: pageSize,
        offset: nextOffset,
      });
      if ("error" in result) return;
      setTotal(result.total);
      setRows((prev) => (replace ? result.rows : [...prev, ...result.rows]));
      setOffset(nextOffset + result.rows.length);
    });
  }

  const hasMore = rows.length < total;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search menus..."
            className="pl-9"
          />
        </div>
        {creators.length > 0 && (
          <Select value={creator} onValueChange={setCreator}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All creators</SelectItem>
              {creators.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-56">Creator</TableHead>
              <TableHead className="w-32">Items</TableHead>
              <TableHead className="w-32">Nested</TableHead>
              <TableHead className="w-56">Updated</TableHead>
              <TableHead className="w-72 text-right">Actions</TableHead>
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
                  No menus found.
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
                        Header
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
                      by {menu.updatedByName ?? "Unknown"}
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
                      onChanged={() => runFetch(0, true)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {rows.length} of {total}
        </p>
        {hasMore && (
          <Button
            variant="outline"
            onClick={() => runFetch(offset, false)}
            disabled={pending}
          >
            {pending ? "Loading..." : "Load more"}
          </Button>
        )}
      </div>
    </div>
  );
}
