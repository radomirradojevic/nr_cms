"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Lock, Pencil, Star } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/components/i18n-provider";
import { TablePagination } from "@/app/dashboard/table-pagination";
import { type Role, hasRole } from "@/lib/roles";
import type { LockHolder } from "@/lib/content-locks";
import {
  getContentStatusLabelKey,
  type ContentStatus,
} from "@/lib/content-status";
import { getContentScheduleState } from "@/lib/content-schedule";
import { ContentRowActions } from "./content-row-actions";
import { BatchActions } from "./batch-actions";
import { useRegionalSettings } from "@/components/regional-settings-provider";
import { DeletedContentRowActions } from "./deleted-content-row-actions";
import { getContentTypeLabelKey, type ContentType } from "@/lib/content-types";

type AllowedPageSize = 10 | 20 | 30 | 50 | 100;

export type ContentRow = {
  id: string;
  contentType: ContentType;
  categoryId: string;
  categoryName: string;
  title: string;
  slug: string;
  status: ContentStatus;
  homepage: boolean;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedByName: string | null;
  updatedAt: string;
  publishedAt: string | null;
  publishAt: string | null;
  unpublishAt: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  deletedByName: string | null;
  editLock: LockHolder | null;
};

type Props = {
  rows: ContentRow[];
  total: number;
  loading: boolean;
  safePage: number;
  totalPages: number;
  pageSize: AllowedPageSize;
  currentUserId: string;
  currentUserRoles: Role[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: AllowedPageSize) => void;
  onMutated: () => void;
  deletedView?: boolean;
};

const statusVariant: Record<
  ContentRow["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "secondary",
  in_review: "outline",
  approved: "secondary",
  published: "default",
  archived: "outline",
};

export function ContentTable({
  rows,
  total,
  loading,
  safePage,
  totalPages,
  pageSize,
  currentUserId,
  currentUserRoles,
  onPageChange,
  onPageSizeChange,
  onMutated,
  deletedView = false,
}: Props) {
  const t = useTranslations();
  const { formatDate, formatDateTime, formatTime } = useRegionalSettings();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const selectableIds = new Set(
        deletedView
          ? []
          : rows.filter((row) => !row.editLock).map((row) => row.id),
      );
      setSelectedIds((prev) => {
        const next = new Set([...prev].filter((id) => selectableIds.has(id)));
        return next.size === prev.size ? prev : next;
      });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [deletedView, rows]);

  const selectableRows = deletedView ? [] : rows.filter((row) => !row.editLock);
  const selectableIdSet = new Set(selectableRows.map((row) => row.id));
  const selectedSelectableIds = Array.from(selectedIds).filter((id) =>
    selectableIdSet.has(id),
  );
  const selectedSelectableSet = new Set(selectedSelectableIds);
  const allSelected =
    selectableRows.length > 0 &&
    selectableRows.every((r) => selectedSelectableSet.has(r.id));
  const someSelected = selectedSelectableIds.length > 0;

  function toggleAll(checked: boolean) {
    setSelectedIds(
      checked ? new Set(selectableRows.map((row) => row.id)) : new Set(),
    );
  }
  function toggleOne(id: string, checked: boolean) {
    const row = rows.find((r) => r.id === id);
    if (!row || row.editLock) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const isAdmin = hasRole(currentUserRoles, "admin");
  const isPublisher = hasRole(currentUserRoles, "publisher");
  const canChangeWorkflowStatus = isAdmin || isPublisher;

  return (
    <div className="space-y-3">
      {!deletedView && someSelected && (
        <BatchActions
          ids={selectedSelectableIds}
          canChangeWorkflowStatus={canChangeWorkflowStatus}
          onCleared={() => {
            setSelectedIds(new Set());
            onMutated();
          }}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : total === 0 ? (
        <p className="text-muted-foreground text-sm py-12 text-center">
          {deletedView
            ? t("dashboard.content.deletedEmpty")
            : t("dashboard.content.empty")}
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                {!deletedView && (
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={
                        allSelected
                          ? true
                          : someSelected
                            ? "indeterminate"
                            : false
                      }
                      disabled={selectableRows.length === 0}
                      onCheckedChange={(c) => toggleAll(!!c)}
                      aria-label={t("dashboard.content.table.selectAll")}
                    />
                  </TableHead>
                )}
                <TableHead>{t("dashboard.common.table.title")}</TableHead>
                <TableHead>{t("dashboard.common.table.type")}</TableHead>
                <TableHead>{t("dashboard.common.table.category")}</TableHead>
                <TableHead>{t("dashboard.common.table.author")}</TableHead>
                <TableHead>{t("dashboard.common.table.status")}</TableHead>
                <TableHead>
                  {deletedView
                    ? t("dashboard.content.table.deleted")
                    : t("dashboard.content.table.updated")}
                </TableHead>
                <TableHead className="text-right">
                  {t("dashboard.common.table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const locked = Boolean(row.editLock);
                const selected = !locked && selectedSelectableSet.has(row.id);
                const scheduleState = getContentScheduleState(row);
                const publishLabel = row.publishAt
                  ? formatDateTime(row.publishAt)
                  : null;
                const unpublishLabel = row.unpublishAt
                  ? formatDateTime(row.unpublishAt)
                  : null;
                return (
                  <TableRow
                    key={row.id}
                    data-state={selected ? "selected" : undefined}
                  >
                    {!deletedView && (
                      <TableCell>
                        <Checkbox
                          checked={selected}
                          disabled={locked}
                          onCheckedChange={(c) => toggleOne(row.id, !!c)}
                          aria-label={
                            locked
                              ? t("dashboard.content.table.rowLocked", {
                                  title: row.title,
                                })
                              : t("dashboard.content.table.selectRow", {
                                  title: row.title,
                                })
                          }
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      <div className="flex flex-wrap items-center gap-2">
                        {deletedView ? (
                          <span>{row.title}</span>
                        ) : (
                          <Link
                            href={`/dashboard/content/${row.id}/edit`}
                            className="hover:underline"
                          >
                            {row.title}
                          </Link>
                        )}
                        {row.editLock && (
                          <Badge
                            variant="outline"
                            className="max-w-[280px] gap-1 text-xs"
                            title={t("dashboard.content.table.lockTitle", {
                              name: row.editLock.userDisplayName,
                              time: formatTime(row.editLock.lastHeartbeatAt),
                            })}
                          >
                            <Lock className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {t("dashboard.content.table.lockBadge", {
                                name: row.editLock.userDisplayName,
                              })}
                            </span>
                          </Badge>
                        )}
                        {row.homepage && (
                          <Badge variant="outline" className="gap-1">
                            <Star className="h-3 w-3 fill-current" />
                            {t("dashboard.content.homepage")}
                          </Badge>
                        )}
                      </div>
                      {deletedView ? (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          /{row.slug}
                        </div>
                      ) : (
                        <a
                          href={`/${row.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground mt-0.5 hover:underline"
                        >
                          /{row.slug}
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {t(getContentTypeLabelKey(row.contentType))}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.categoryName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{row.authorName}</div>
                      <div className="mt-0.5">{formatDate(row.createdAt)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={statusVariant[row.status]}>
                          {t(getContentStatusLabelKey(row.status))}
                        </Badge>
                        {scheduleState && (
                          <div>
                            <Badge
                              variant={
                                scheduleState === "expired"
                                  ? "destructive"
                                  : "outline"
                              }
                              className="text-[10px]"
                            >
                              {scheduleState === "scheduled"
                                ? t("dashboard.content.schedule.scheduled")
                                : scheduleState === "live_until"
                                  ? t("dashboard.content.schedule.liveUntil")
                                  : t("dashboard.content.schedule.expired")}
                            </Badge>
                          </div>
                        )}
                        {(publishLabel || unpublishLabel) && (
                          <div className="space-y-0.5 text-xs text-muted-foreground">
                            {publishLabel && (
                              <div>
                                {t("dashboard.content.schedule.publish", {
                                  date: publishLabel,
                                })}
                              </div>
                            )}
                            {unpublishLabel && (
                              <div>
                                {t("dashboard.content.schedule.unpublish", {
                                  date: unpublishLabel,
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {deletedView ? (
                        <>
                          <div>
                            {row.deletedAt
                              ? formatDateTime(row.deletedAt)
                              : t("dashboard.common.meta.unknown")}
                          </div>
                          <div className="mt-0.5">
                            {t("dashboard.common.meta.by", {
                              name:
                                row.deletedByName ??
                                t("dashboard.common.meta.unknown"),
                            })}
                          </div>
                        </>
                      ) : (
                        <>
                          <div>{formatDateTime(row.updatedAt)}</div>
                          <div className="mt-0.5">
                            {t("dashboard.common.meta.by", {
                              name:
                                row.updatedByName ??
                                t("dashboard.common.meta.unknown"),
                            })}
                          </div>
                        </>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {deletedView ? (
                          <DeletedContentRowActions
                            row={row}
                            currentUserRoles={currentUserRoles}
                            onMutated={onMutated}
                          />
                        ) : (
                          <>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/dashboard/content/${row.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">
                                  {t("dashboard.common.actions.edit")}
                                </span>
                              </Link>
                            </Button>
                            <ContentRowActions
                              row={row}
                              currentUserId={currentUserId}
                              currentUserRoles={currentUserRoles}
                              onMutated={onMutated}
                            />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination
            page={safePage}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={onPageChange}
            onPageSizeChange={(s) => onPageSizeChange(s as AllowedPageSize)}
          />
        </>
      )}
    </div>
  );
}
