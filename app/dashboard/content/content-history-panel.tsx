"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Info, Loader2, RotateCcw } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getContentStatusLabel,
  type ContentStatus,
} from "@/lib/content-status";
import { listContentRevisionHistory, restoreContentRevision } from "./actions";

export type ContentHistoryRevision = {
  id: number;
  revisionNumber: number;
  contentVersion: number;
  changeType: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  status: ContentStatus;
  title: string;
  slug: string;
  homepage: boolean;
  publishAt: string | null;
  unpublishAt: string | null;
};

type ContentHistoryFilter = "all" | "saved" | "workflow" | "restored";

type CurrentSnapshot = {
  slug: string;
  status: ContentStatus;
  homepage: boolean;
  publishAt: string | null;
  unpublishAt: string | null;
};

type Props = {
  contentId: string;
  current: CurrentSnapshot;
  revisions: ContentHistoryRevision[];
  total: number;
  expectedVersion?: number;
  lockClientId?: string;
  contentHistoryEnabled?: boolean;
  restoreDisabled?: boolean;
  onRestored?: (version: number) => void;
  onStaleVersion?: (version: number | null) => void;
};

const HISTORY_PAGE_SIZE = 3;

const HISTORY_FILTERS: Array<{ value: ContentHistoryFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "saved", label: "Edits" },
  { value: "workflow", label: "Publishing" },
  { value: "restored", label: "Restores" },
];

const HISTORY_FILTER_HELP: Array<{ label: string; description: string }> = [
  {
    label: "All",
    description: "Shows every saved revision and workflow event.",
  },
  {
    label: "Edits",
    description: "Shows content creation and manual saves.",
  },
  {
    label: "Publishing",
    description: "Shows status, publish, archive, and schedule changes.",
  },
  {
    label: "Restores",
    description: "Shows when an older revision was restored.",
  },
];

export function ContentHistoryPanel({
  contentId,
  current,
  revisions,
  total,
  expectedVersion,
  lockClientId,
  contentHistoryEnabled = true,
  restoreDisabled = false,
  onRestored,
  onStaleVersion,
}: Props) {
  const router = useRouter();
  const historyRequestIdRef = useRef(0);
  const [items, setItems] = useState(revisions);
  const [totalCount, setTotalCount] = useState(total);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ContentHistoryFilter>("all");
  const [historyRequest, setHistoryRequest] = useState<
    "filter" | "older" | null
  >(null);
  const [pendingRevisionId, setPendingRevisionId] = useState<number | null>(
    null,
  );
  const [isRestorePending, startRestoreTransition] = useTransition();
  const [isHistoryPending, startHistoryTransition] = useTransition();
  const restorePending = isRestorePending || pendingRevisionId !== null;
  const loadingHistory = isHistoryPending || historyRequest !== null;
  const empty = items.length === 0;
  const canLoadMore = items.length < totalCount;

  const groups = useMemo(() => groupRevisionsByDate(items), [items]);
  const visibleCountLabel = useMemo(() => {
    if (totalCount <= items.length) return `${items.length}`;
    return `${items.length} of ${totalCount}`;
  }, [items.length, totalCount]);

  function loadHistory(input: {
    nextFilter: ContentHistoryFilter;
    nextPage: number;
    append: boolean;
  }) {
    const requestId = historyRequestIdRef.current + 1;
    historyRequestIdRef.current = requestId;
    setHistoryRequest(input.append ? "older" : "filter");

    startHistoryTransition(async () => {
      try {
        const result = await listContentRevisionHistory({
          contentId,
          filter: input.nextFilter,
          page: input.nextPage,
          pageSize: HISTORY_PAGE_SIZE,
        });
        if (requestId !== historyRequestIdRef.current) return;

        if ("error" in result) {
          toast.error(result.error);
          return;
        }

        setItems((currentItems) =>
          input.append
            ? mergeRevisionPages(currentItems, result.revisions)
            : result.revisions,
        );
        setTotalCount(result.total);
        setPage(result.page);
        setFilter(input.nextFilter);
      } catch {
        toast.error("History could not be loaded.");
      } finally {
        if (requestId === historyRequestIdRef.current) {
          setHistoryRequest(null);
        }
      }
    });
  }

  function restoreRevision(revision: ContentHistoryRevision) {
    preserveHistoryInspectorTab();
    setPendingRevisionId(revision.id);
    startRestoreTransition(async () => {
      try {
        const result = await restoreContentRevision({
          contentId,
          revisionId: revision.id,
          expectedVersion,
          lockClientId,
        });
        if (result.error) {
          toast.error(result.error);
          if ("code" in result && result.code === "STALE_CONTENT") {
            onStaleVersion?.(
              "currentVersion" in result &&
                typeof result.currentVersion === "number"
                ? result.currentVersion
                : null,
            );
          }
          return;
        }

        if (typeof result.version === "number") {
          onRestored?.(result.version);
        }
        toast.success(`Revision #${revision.revisionNumber} restored.`);
        for (const warning of result.warnings ?? []) {
          toast.warning(warning);
        }
        preserveHistoryInspectorTab();
        router.refresh();
      } catch {
        toast.error("Restore failed. Please try again.");
      } finally {
        setPendingRevisionId(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-medium">
              History{" "}
              {!contentHistoryEnabled && (
                <span className="inline-flex items-center gap-1 text-amber-500">
                  (disabled)
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-5 text-amber-500 hover:text-amber-600"
                        aria-label="Content history is disabled"
                      >
                        <Info aria-hidden className="size-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-72 text-sm">
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Versioning is disabled globally. New content changes
                          will not create revision snapshots.
                        </p>
                        <Button asChild variant="outline" size="sm">
                          <Link href="/dashboard/global-settings?tab=system">
                            Open System settings
                          </Link>
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              {empty ? "No revisions" : `${visibleCountLabel} revisions`}
            </p>
          </div>
          {loadingHistory && (
            <Loader2
              aria-label="Loading history"
              className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground"
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={filter}
            onValueChange={(value) =>
              loadHistory({
                nextFilter: value as ContentHistoryFilter,
                nextPage: 1,
                append: false,
              })
            }
            disabled={loadingHistory}
          >
            <SelectTrigger size="sm" className="min-w-0 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HISTORY_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Explain history filters"
              >
                <Info className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 text-sm">
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium">History filters</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use these when the revision list gets long.
                  </p>
                </div>
                <dl className="space-y-2">
                  {HISTORY_FILTER_HELP.map((item) => (
                    <div key={item.label} className="space-y-0.5">
                      <dt className="text-xs font-medium">{item.label}</dt>
                      <dd className="text-xs text-muted-foreground">
                        {item.description}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {empty ? (
        <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          {filter === "all"
            ? "Revisions will appear after the next save or workflow change."
            : "No revisions match this filter."}
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.label} className="space-y-2">
              <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </h3>
              <div className="relative space-y-2 border-l border-border/70 pl-3">
                {group.revisions.map((revision) => (
                  <div
                    key={revision.id}
                    className="relative rounded-md border bg-background/70 px-2.5 py-2"
                  >
                    <span
                      aria-hidden
                      className="absolute -left-[17px] top-3 h-2 w-2 rounded-full border border-background bg-primary"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="h-5 px-1.5">
                          #{revision.revisionNumber}
                        </Badge>
                        <Badge variant="secondary" className="h-5 px-1.5">
                          {formatChangeType(revision.changeType)}
                        </Badge>
                        <Badge variant="outline" className="h-5 px-1.5">
                          {getContentStatusLabel(revision.status)}
                        </Badge>
                      </div>
                      <p className="truncate text-sm font-medium">
                        {revision.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        /{revision.slug}
                      </p>
                      <p
                        className="truncate text-[11px] text-muted-foreground"
                        title={revision.createdBy}
                      >
                        {formatTime(revision.createdAt)} by{" "}
                        {revision.createdByName}
                      </p>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8"
                      >
                        <Link
                          href={`/dashboard/content/${contentId}/history/${revision.id}`}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            disabled={restoreDisabled || restorePending}
                          >
                            {pendingRevisionId === revision.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                            Restore
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Restore revision #{revision.revisionNumber}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This replaces the saved content with the revision
                              snapshot and creates a new revision of the current
                              state first.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <RestoreWarnings
                            current={current}
                            revision={revision}
                          />
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={restorePending}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              disabled={restorePending}
                              onClick={(event) => {
                                event.preventDefault();
                                restoreRevision(revision);
                              }}
                            >
                              Restore
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {canLoadMore && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={loadingHistory}
              onClick={() =>
                loadHistory({
                  nextFilter: filter,
                  nextPage: page + 1,
                  append: true,
                })
              }
            >
              {historyRequest === "older" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Load older
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function preserveHistoryInspectorTab() {
  const url = new URL(window.location.href);
  url.searchParams.set("inspector", "history");
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

function RestoreWarnings({
  current,
  revision,
}: {
  current: CurrentSnapshot;
  revision: ContentHistoryRevision;
}) {
  const warnings = [
    current.slug !== revision.slug
      ? `Slug changes to /${revision.slug}.`
      : null,
    current.status !== revision.status
      ? `Status changes to ${revision.status}.`
      : null,
    current.homepage !== revision.homepage
      ? revision.homepage
        ? "Revision was marked as homepage."
        : "Revision was not marked as homepage."
      : null,
    current.publishAt !== revision.publishAt ||
    current.unpublishAt !== revision.unpublishAt
      ? "Schedule fields change."
      : null,
    hasExpiredRestoreSchedule(revision)
      ? "Expired schedule dates will be cleared."
      : null,
  ].filter((warning): warning is string => Boolean(warning));

  if (warnings.length === 0) return null;

  return (
    <div className="rounded-md border bg-muted/30 p-3 text-xs">
      <p className="mb-2 font-medium">Restore impact</p>
      <ul className="space-y-1 text-muted-foreground">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}

function hasExpiredRestoreSchedule(revision: ContentHistoryRevision) {
  const now = Date.now();
  const publishAt = revision.publishAt ? Date.parse(revision.publishAt) : null;
  const unpublishAt = revision.unpublishAt
    ? Date.parse(revision.unpublishAt)
    : null;

  return (
    (revision.status === "approved" &&
      publishAt !== null &&
      Number.isFinite(publishAt) &&
      publishAt <= now) ||
    (unpublishAt !== null && Number.isFinite(unpublishAt) && unpublishAt <= now)
  );
}

function mergeRevisionPages(
  current: ContentHistoryRevision[],
  next: ContentHistoryRevision[],
) {
  const seen = new Set<number>();
  return [...current, ...next].filter((revision) => {
    if (seen.has(revision.id)) return false;
    seen.add(revision.id);
    return true;
  });
}

function groupRevisionsByDate(revisions: ContentHistoryRevision[]) {
  const groups: Array<{ label: string; revisions: ContentHistoryRevision[] }> =
    [];

  for (const revision of revisions) {
    const label = formatDateGroup(revision.createdAt);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.label === label) {
      lastGroup.revisions.push(revision);
    } else {
      groups.push({ label, revisions: [revision] });
    }
  }

  return groups;
}

function formatDateGroup(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const daysAgo = Math.round(
    (today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  return date.toLocaleDateString();
}

function formatChangeType(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
