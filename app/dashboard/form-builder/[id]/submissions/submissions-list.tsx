"use client";

import { useState, useTransition } from "react";
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
import { TablePagination } from "@/app/dashboard/table-pagination";
import { useTranslations } from "@/components/i18n-provider";
import { useRegionalSettings } from "@/components/regional-settings-provider";
import { useSourceTranslations } from "@/components/source-translations";

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

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100] as const;

type Props = {
  formId: string;
  fields: FormFieldRow[];
  initialRows: FormSubmissionRow[];
  initialTotal: number;
  pageSize: number;
};

function statusBadge(s: string, label: string) {
  if (s === "new") return <Badge>{label}</Badge>;
  if (s === "read") return <Badge variant="secondary">{label}</Badge>;
  return <Badge variant="destructive">{label}</Badge>;
}

function statusLabel(
  status: string,
  labels: Record<StatusFilter, string>,
): string {
  if (STATUS_FILTER.includes(status as StatusFilter)) {
    return labels[status as StatusFilter];
  }
  return status;
}

export function SubmissionsList({
  formId,
  fields,
  initialRows,
  initialTotal,
  pageSize: initialPageSize,
}: Props) {
  const t = useTranslations();
  const st = useSourceTranslations();
  const { formatDateTime } = useRegionalSettings();
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
    PAGE_SIZE_OPTIONS.includes(
      initialPageSize as (typeof PAGE_SIZE_OPTIONS)[number],
    )
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
        toast.error(st(res.error));
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
        toast.error(st(r.error ?? "Something went wrong."));
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
        toast.error(st(r.error));
        return;
      }
      toast.success(st("{count} updated.", { count: r.count }));
      reload(1);
    });
  }

  function deleteOne() {
    if (!deleteId) return;
    const id = deleteId;
    startTransition(async () => {
      const r = await deleteSubmissionAction({ id });
      if ("error" in r && r.error) {
        toast.error(st(r.error));
        setDeleteId(null);
        return;
      }
      setRows((prev) => prev.filter((x) => x.id !== id));
      setTotal((t) => t - 1);
      setDeleteId(null);
      toast.success(st("Deleted."));
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
      if ("error" in r && r.error) {
        toast.error(st(r.error));
        return;
      }
      const csv = "csv" in r && typeof r.csv === "string" ? r.csv : null;
      if (!csv) {
        toast.error(st("Something went wrong."));
        return;
      }
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
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
  const statusLabels: Record<StatusFilter, string> = {
    all: t("dashboard.filters.allStatuses"),
    new: t("dashboard.forms.submissionStatus.new"),
    read: t("dashboard.forms.submissionStatus.read"),
    spam: t("dashboard.forms.submissionStatus.spam"),
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">{st("Search")}</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={st("Search values…")}
            className="w-56"
            onKeyDown={(e) => e.key === "Enter" && reload(1)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            {t("dashboard.common.table.status")}
          </Label>
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
                  {statusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{st("From")}</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{st("To")}</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <Button onClick={() => reload(1)} disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <RefreshCw className="mr-2 h-4 w-4" /> {st("Apply")}
        </Button>
        <Button variant="outline" onClick={exportCsv} disabled={exporting}>
          {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Download className="mr-2 h-4 w-4" /> CSV
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {st("{count} selected", { count: selected.size })}
          </span>
          <Button size="sm" variant="outline" onClick={() => bulk("mark_read")}>
            {st("Mark read")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulk("mark_new")}>
            {st("Mark new")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulk("mark_spam")}>
            {st("Mark spam")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => bulk("delete")}
          >
            <Trash2 className="mr-1 h-3 w-3" /> {st("Delete")}
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allChecked}
                onCheckedChange={(c) => toggleAll(c === true)}
                aria-label={st("Select all")}
              />
            </TableHead>
            <TableHead>{st("Submitted")}</TableHead>
            <TableHead>{t("dashboard.common.table.status")}</TableHead>
            <TableHead>{st("Email")}</TableHead>
            <TableHead>{st("Preview")}</TableHead>
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
                {st("No submissions.")}
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
                      aria-label={st("Select row")}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDateTime(r.createdAt)}
                  </TableCell>
                  <TableCell>
                    {statusBadge(r.status, statusLabel(r.status, statusLabels))}
                  </TableCell>
                  <TableCell className="text-xs">{r.emailStatus}</TableCell>
                  <TableCell
                    className="max-w-md truncate text-xs"
                    title={preview}
                  >
                    {preview || (
                      <span className="text-muted-foreground">
                        {st("(empty)")}
                      </span>
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
                        {st("View")}
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
                          <SelectItem value="new">
                            {statusLabels.new}
                          </SelectItem>
                          <SelectItem value="read">
                            {statusLabels.read}
                          </SelectItem>
                          <SelectItem value="spam">
                            {statusLabels.spam}
                          </SelectItem>
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

      <TablePagination
        disabled={pending}
        label={
          <>
            {total === 0
              ? "0"
              : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)}`}{" "}
            {st("of")} {total}
          </>
        }
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={(nextPage) => reload(nextPage)}
        onPageSizeChange={(nextPageSize) => reload(1, nextPageSize)}
      />

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{st("Submission detail")}</DialogTitle>
            <DialogDescription>
              {detail && formatDateTime(detail.createdAt)}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-2 text-xs">
                <span className="text-muted-foreground">
                  {t("dashboard.common.table.status")}
                </span>
                <span>
                  {statusBadge(
                    detail.status,
                    statusLabel(detail.status, statusLabels),
                  )}
                </span>
                <span className="text-muted-foreground">
                  {st("Email status")}
                </span>
                <span>{st(detail.emailStatus)}</span>
                {detail.emailStatus === "failed" && detail.emailError && (
                  <>
                    <span className="text-muted-foreground">
                      {st("Email error")}
                    </span>
                    <span className="break-all text-destructive">
                      {detail.emailError}
                    </span>
                  </>
                )}
                <span className="text-muted-foreground">{st("IP hash")}</span>
                <span className="font-mono text-[10px] break-all">
                  {detail.ipHash ?? st("(none)")}
                </span>
                <span className="text-muted-foreground">
                  {st("User agent")}
                </span>
                <span className="text-[10px] break-all">
                  {detail.userAgent ?? st("(none)")}
                </span>
                <span className="text-muted-foreground">{st("Referer")}</span>
                <span className="text-[10px] break-all">
                  {detail.referer ?? st("(none)")}
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
            <AlertDialogTitle>{st("Delete submission?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {st("This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{st("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={deleteOne}>
              {st("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
