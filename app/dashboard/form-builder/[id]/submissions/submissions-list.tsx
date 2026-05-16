"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Download, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  bulkSubmissionAction,
  deleteSubmission as deleteSubmissionAction,
  exportSubmissionsCsvAction,
  fetchSubmissions,
  setSubmissionStatus,
} from "../../actions";
import type {
  FormFieldRow,
  FormSubmissionRow,
  SubmissionStatus,
} from "@/lib/form-types";

const STATUS_FILTER = ["all", "new", "read", "spam"] as const;
type StatusFilter = (typeof STATUS_FILTER)[number];

const PAGE_SIZE_OPTIONS = [10, 20, 30] as const;

type Props = {
  formId: string;
  fields: FormFieldRow[];
  initialRows: FormSubmissionRow[];
  initialTotal: number;
  pageSize: number;
};

function statusBadge(s: string) {
  if (s === "new") return <Badge>new</Badge>;
  if (s === "read") return <Badge variant="secondary">read</Badge>;
  return <Badge variant="destructive">spam</Badge>;
}

export function SubmissionsList({
  formId,
  fields,
  initialRows,
  initialTotal,
  pageSize: initialPageSize,
}: Props) {
  const [rows, setRows] = useState<FormSubmissionRow[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [exporting, startExport] = useTransition();
  const [detail, setDetail] = useState<FormSubmissionRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(
    PAGE_SIZE_OPTIONS.includes(initialPageSize as (typeof PAGE_SIZE_OPTIONS)[number])
      ? initialPageSize
      : PAGE_SIZE_OPTIONS[0],
  );

  function reload(newPage = page, newPageSize = pageSize) {
    startTransition(async () => {
      const res = await fetchSubmissions({
        formId,
        status: status === "all" ? undefined : status,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: search.trim() || undefined,
        limit: newPageSize,
        offset: (newPage - 1) * newPageSize,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setRows(res.rows);
      setTotal(res.total);
      setPage(newPage);
      setPageSize(newPageSize);
      setSelected(new Set());
    });
  }

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelected(new Set(rows.map((r) => r.id)));
    } else {
      setSelected(new Set());
    }
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function setStatusOne(id: string, s: SubmissionStatus) {
    startTransition(async () => {
      const r = await setSubmissionStatus({ id, status: s });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      setRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, status: s } : row)),
      );
    });
  }

  function bulk(action: "mark_read" | "mark_new" | "mark_spam" | "delete") {
    if (selected.size === 0) return;
    startTransition(async () => {
      const r = await bulkSubmissionAction({
        ids: Array.from(selected),
        action,
      });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(`${r.count} updated.`);
      reload(1);
    });
  }

  function deleteOne() {
    if (!deleteId) return;
    const id = deleteId;
    startTransition(async () => {
      const r = await deleteSubmissionAction({ id });
      if ("error" in r && r.error) {
        toast.error(r.error);
        setDeleteId(null);
        return;
      }
      setRows((prev) => prev.filter((x) => x.id !== id));
      setTotal((t) => t - 1);
      setDeleteId(null);
      toast.success("Deleted.");
    });
  }

  function exportCsv() {
    startExport(async () => {
      const r = await exportSubmissionsCsvAction({
        formId,
        status: status === "all" ? undefined : status,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: search.trim() || undefined,
      });
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      const blob = new Blob([r.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `submissions-${formId}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  const allChecked = rows.length > 0 && selected.size === rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Search</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search values…"
            className="w-56"
            onKeyDown={(e) => e.key === "Enter" && reload(true)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as StatusFilter)}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <Button onClick={() => reload(1)} disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <RefreshCw className="mr-2 h-4 w-4" /> Apply
        </Button>
        <Button variant="outline" onClick={exportCsv} disabled={exporting}>
          {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Download className="mr-2 h-4 w-4" /> CSV
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {selected.size} selected
          </span>
          <Button size="sm" variant="outline" onClick={() => bulk("mark_read")}>
            Mark read
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulk("mark_new")}>
            Mark new
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulk("mark_spam")}>
            Mark spam
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => bulk("delete")}
          >
            <Trash2 className="mr-1 h-3 w-3" /> Delete
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={(c) => toggleAll(c === true)}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead className="w-[1%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  No submissions.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const data = (r.data ?? {}) as Record<string, unknown>;
                const preview = fields
                  .slice(0, 3)
                  .map((f) => {
                    const v = data[f.fieldKey];
                    if (v === null || v === undefined || v === "") return null;
                    if (Array.isArray(v)) return `${f.label}: ${v.join(", ")}`;
                    if (typeof v === "object" && "originalName" in v)
                      return `${f.label}: ${(v as { originalName: string }).originalName}`;
                    return `${f.label}: ${String(v)}`;
                  })
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={(c) => toggleOne(r.id, c === true)}
                        aria-label="Select row"
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {format(new Date(r.createdAt), "PPp")}
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-xs">{r.emailStatus}</TableCell>
                    <TableCell
                      className="max-w-md truncate text-xs"
                      title={preview}
                    >
                      {preview || (
                        <span className="text-muted-foreground">(empty)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setDetail(r);
                            if (r.status === "new") {
                              setStatusOne(r.id, "read");
                            }
                          }}
                        >
                          View
                        </Button>
                        <Select
                          value={r.status}
                          onValueChange={(v) =>
                            setStatusOne(r.id, v as SubmissionStatus)
                          }
                        >
                          <SelectTrigger className="h-7 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper" align="end">
                            <SelectItem value="new">new</SelectItem>
                            <SelectItem value="read">read</SelectItem>
                            <SelectItem value="spam">spam</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setDeleteId(r.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Per page</Label>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => reload(1, Number(v))}
            disabled={pending}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {total === 0
              ? "0"
              : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}`}{" "}
            of {total}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => reload(page - 1)}
            disabled={page <= 1 || pending}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => reload(page + 1)}
            disabled={page >= totalPages || pending}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submission detail</DialogTitle>
            <DialogDescription>
              {detail && format(new Date(detail.createdAt), "PPpp")}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                <span className="text-muted-foreground">Status</span>
                <span>{detail.status}</span>
                <span className="text-muted-foreground">Email status</span>
                <span>{detail.emailStatus}</span>
                {detail.emailStatus === "failed" && detail.emailError && (
                  <>
                    <span className="text-muted-foreground">Email error</span>
                    <span className="break-all text-destructive">
                      {detail.emailError}
                    </span>
                  </>
                )}
                <span className="text-muted-foreground">IP hash</span>
                <span className="font-mono text-[10px] break-all">
                  {detail.ipHash ?? "(none)"}
                </span>
                <span className="text-muted-foreground">User agent</span>
                <span className="text-[10px] break-all">
                  {detail.userAgent ?? "(none)"}
                </span>
                <span className="text-muted-foreground">Referer</span>
                <span className="text-[10px] break-all">
                  {detail.referer ?? "(none)"}
                </span>
              </div>
              <div className="rounded-md border">
                <table className="w-full text-xs">
                  <tbody>
                    {fields.map((f) => {
                      const data = (detail.data ?? {}) as Record<
                        string,
                        unknown
                      >;
                      const v = data[f.fieldKey];
                      let display: string;
                      if (v === null || v === undefined) {
                        display = "—";
                      } else if (Array.isArray(v)) {
                        display = (v as unknown[]).join(", ");
                      } else if (
                        typeof v === "object" &&
                        v !== null &&
                        "originalName" in v
                      ) {
                        const fv = v as {
                          originalName: string;
                          fileId: string;
                        };
                        display = `${fv.originalName} (${fv.fileId})`;
                      } else {
                        display = String(v);
                      }
                      return (
                        <tr key={f.id} className="border-b last:border-0">
                          <td className="w-1/3 bg-muted/30 px-2 py-1 align-top font-medium">
                            {f.label}
                            <div className="text-[10px] text-muted-foreground">
                              {f.fieldKey}
                            </div>
                          </td>
                          <td className="px-2 py-1 whitespace-pre-wrap">
                            {display}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteOne}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
