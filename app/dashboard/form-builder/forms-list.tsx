"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  FileText,
  Inbox,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchFormsList } from "./actions";
import { DeleteFormDialog } from "./delete-form-dialog";
import type { FormRow, FormStatus } from "@/lib/form-types";

type Row = FormRow & { submissionCount: number; fieldCount: number };

type Props = {
  initialRows: Row[];
  initialTotal: number;
  pageSize: number;
};

export function FormsList({ initialRows, initialTotal, pageSize }: Props) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(initialRows.length);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | FormStatus>("all");
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runFetch(0, true), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  function runFetch(nextOffset: number, replace: boolean) {
    startTransition(async () => {
      const res = await fetchFormsList({
        search: search || undefined,
        status: status === "all" ? undefined : status,
        limit: pageSize,
        offset: nextOffset,
      });
      if ("error" in res) return;
      setTotal(res.total);
      setRows((prev) => (replace ? res.rows : [...prev, ...res.rows]));
      setOffset(nextOffset + res.rows.length);
    });
  }

  const hasMore = rows.length < total;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search forms…"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as "all" | FormStatus)}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Fields</TableHead>
              <TableHead className="text-right">Submissions</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending && rows.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-10"
                >
                  No forms yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/form-builder/${r.id}`}
                      className="font-medium hover:underline"
                    >
                      {r.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{r.slug}</p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "published" ? "default" : "secondary"
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.fieldCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.submissionCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {format(new Date(r.updatedAt), "PPp")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/form-builder/${r.id}`}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/dashboard/form-builder/${r.id}/submissions`}
                          >
                            <Inbox className="mr-2 h-4 w-4" /> Submissions
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/form-builder/${r.id}`}>
                            <FileText className="mr-2 h-4 w-4" /> Fields
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => setDeleteTarget(r)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
            {pending ? "Loading…" : "Load more"}
          </Button>
        )}
      </div>

      {deleteTarget && (
        <DeleteFormDialog
          id={deleteTarget.id}
          name={deleteTarget.name}
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          onDeleted={(id) => {
            setRows((prev) => prev.filter((r) => r.id !== id));
            setTotal((t) => Math.max(0, t - 1));
            setOffset((o) => Math.max(0, o - 1));
          }}
        />
      )}
    </div>
  );
}
