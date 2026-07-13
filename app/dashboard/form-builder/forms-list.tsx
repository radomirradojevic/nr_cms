"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  FileText,
  Inbox,
  Lock,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  UserCog,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { TablePagination } from "@/app/dashboard/table-pagination";
import { fetchFormsList } from "./actions";
import { DeleteFormDialog } from "./delete-form-dialog";
import { ReassignFormDialog } from "./reassign-form-dialog";
import { useRegionalSettings } from "@/components/regional-settings-provider";
import type { FormLockHolder } from "@/lib/form-locks";
import type { FormRow, FormStatus } from "@/lib/form-types";

type Row = FormRow & {
  submissionCount: number;
  fieldCount: number;
  createdByName: string | null;
  updatedByName: string | null;
  editLock: FormLockHolder | null;
};

type FormCreatorInfo = {
  id: string;
  name: string;
};

type Props = {
  initialRows: Row[];
  initialTotal: number;
  pageSize: number;
  creators: FormCreatorInfo[];
};

export function FormsList({
  initialRows,
  initialTotal,
  pageSize,
  creators,
}: Props) {
  const t = useTranslations();
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | FormStatus>("all");
  const [creator, setCreator] = useState("all");
  const [extraCreatorOptions, setExtraCreatorOptions] = useState<
    FormCreatorInfo[]
  >([]);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [reassignTarget, setReassignTarget] = useState<Row | null>(null);
  const { formatDate, formatDateTime, formatTime } = useRegionalSettings();
  const creatorOptions = useMemo(
    () => mergeCreatorOptions(creators, extraCreatorOptions),
    [creators, extraCreatorOptions],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runFetch(1), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, creator]);

  function runFetch(
    nextPage = page,
    nextPageSize = currentPageSize,
    options?: { silent?: boolean },
  ) {
    const load = async () => {
      const res = await fetchFormsList({
        search: search || undefined,
        status: status === "all" ? undefined : status,
        createdBy: creator === "all" ? undefined : creator,
        limit: nextPageSize,
        offset: (nextPage - 1) * nextPageSize,
      });
      if ("error" in res) return;
      setTotal(res.total);
      setRows(res.rows);
      setPage(nextPage);
      setCurrentPageSize(nextPageSize);
    };

    if (options?.silent) {
      void load();
      return;
    }
    startTransition(load);
  }

  useEffect(() => {
    const refreshLocks = () =>
      runFetch(page, currentPageSize, {
        silent: true,
      });
    window.addEventListener("focus", refreshLocks);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshLocks();
    }, 15000);
    return () => {
      window.removeEventListener("focus", refreshLocks);
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, creator, page, currentPageSize]);

  const totalPages = Math.max(1, Math.ceil(total / currentPageSize));
  const safePage = Math.min(page, totalPages);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("dashboard.forms.searchPlaceholder")}
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
            <SelectItem value="all">
              {t("dashboard.filters.allStatuses")}
            </SelectItem>
            <SelectItem value="draft">
              {t("dashboard.forms.status.draft")}
            </SelectItem>
            <SelectItem value="published">
              {t("dashboard.forms.status.published")}
            </SelectItem>
          </SelectContent>
        </Select>
        {creatorOptions.length > 0 && (
          <Select value={creator} onValueChange={setCreator}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("dashboard.filters.allCreators")}
              </SelectItem>
              {creatorOptions.map((option) => (
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
            <TableHead>{t("dashboard.common.table.status")}</TableHead>
            <TableHead>{t("dashboard.common.table.creator")}</TableHead>
            <TableHead className="text-right">
              {t("dashboard.forms.fields")}
            </TableHead>
            <TableHead className="text-right">
              {t("dashboard.forms.submissions")}
            </TableHead>
            <TableHead>{t("dashboard.common.table.updated")}</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {pending && rows.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={7}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center text-muted-foreground py-10"
              >
                {t("dashboard.forms.noFormsYet")}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => {
              const locked = Boolean(r.editLock);
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/form-builder/${r.id}`}
                        className="font-medium hover:underline"
                      >
                        {r.name}
                      </Link>
                      {r.editLock && (
                        <Badge
                          variant="outline"
                          className="max-w-[280px] gap-1 text-xs"
                          title={t("dashboard.forms.lockTitle", {
                            name: r.editLock.userDisplayName,
                            time: formatTime(r.editLock.lastHeartbeatAt),
                          })}
                        >
                          <Lock className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {t("dashboard.forms.lockBadge", {
                              name: r.editLock.userDisplayName,
                            })}
                          </span>
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{r.slug}</p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "published" ? "default" : "secondary"
                      }
                    >
                      {t(`dashboard.forms.status.${r.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>{r.createdByName ?? "—"}</div>
                    <div className="mt-0.5">{formatDate(r.createdAt)}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.fieldCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.submissionCount}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>{formatDateTime(r.updatedAt)}</div>
                    <div className="mt-0.5">
                      {t("dashboard.common.meta.by", {
                        name:
                          r.updatedByName ?? t("dashboard.common.meta.unknown"),
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        {r.editLock && (
                          <>
                            <DropdownMenuItem
                              disabled
                              className="whitespace-normal text-muted-foreground"
                            >
                              <Lock className="mr-2 h-4 w-4 shrink-0" />
                              {t("dashboard.forms.lockedBy", {
                                name: r.editLock.userDisplayName,
                              })}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/form-builder/${r.id}`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("dashboard.common.actions.edit")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/dashboard/form-builder/${r.id}/submissions`}
                          >
                            <Inbox className="mr-2 h-4 w-4" />
                            {t("dashboard.forms.submissions")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/form-builder/${r.id}`}>
                            <FileText className="mr-2 h-4 w-4" />
                            {t("dashboard.forms.fields")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={locked}
                          onSelect={() => setReassignTarget(r)}
                        >
                          <UserCog className="mr-2 h-4 w-4" />
                          {t("dashboard.common.actions.reassign")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={locked}
                          onSelect={() => setDeleteTarget(r)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("dashboard.common.actions.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
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

      {deleteTarget && (
        <DeleteFormDialog
          id={deleteTarget.id}
          name={deleteTarget.name}
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          onDeleted={(id) => {
            setRows((prev) => prev.filter((r) => r.id !== id));
            setTotal((t) => Math.max(0, t - 1));
            setDeleteTarget(null);
            runFetch(safePage);
          }}
        />
      )}

      {reassignTarget && (
        <ReassignFormDialog
          formId={reassignTarget.id}
          formName={reassignTarget.name}
          currentOwnerId={reassignTarget.createdBy ?? null}
          currentOwnerName={reassignTarget.createdByName}
          open={!!reassignTarget}
          onOpenChange={(o) => !o && setReassignTarget(null)}
          onReassigned={(id, newOwnerId, newOwnerName) => {
            setExtraCreatorOptions((prev) =>
              mergeCreatorOptions(prev, [
                { id: newOwnerId, name: newOwnerName },
              ]),
            );
            setRows((prev) =>
              creator !== "all" && creator !== newOwnerId
                ? prev.filter((r) => r.id !== id)
                : prev.map((r) =>
                    r.id === id
                      ? {
                          ...r,
                          createdBy: newOwnerId,
                          createdByName: newOwnerName,
                        }
                      : r,
                  ),
            );
            if (creator !== "all" && creator !== newOwnerId) {
              setTotal((t) => Math.max(0, t - 1));
              runFetch(safePage);
            }
            setReassignTarget(null);
          }}
        />
      )}
    </div>
  );
}

function mergeCreatorOptions(
  existing: FormCreatorInfo[],
  incoming: FormCreatorInfo[],
) {
  const byId = new Map(existing.map((option) => [option.id, option]));
  for (const option of incoming) byId.set(option.id, option);
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}
