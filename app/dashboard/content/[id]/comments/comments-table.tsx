"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/app/dashboard/table-pagination";
import type { CommentRow } from "@/data/comments";
import { CommentRowActions } from "./comment-row-actions";
import { bulkModerate } from "@/app/dashboard/content/comment-actions";
import { useTranslations } from "@/components/i18n-provider";
import { useRegionalSettings } from "@/components/regional-settings-provider";

type Props = {
  postId: string;
  rows: CommentRow[];
  total: number;
  page: number;
  pageSize: number;
  status: "all" | "pending" | "published";
  search: string;
  parentLookup: Record<string, string | null>; // commentId -> parent author or null
};

function truncate(s: string, n = 140) {
  if (s.length <= n) return s;
  return s.slice(0, n) + "…";
}

export function CommentsTable({
  postId,
  rows,
  total,
  page,
  pageSize,
  status,
  search,
  parentLookup,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const t = useTranslations();
  const { formatDateTime } = useRegionalSettings();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(sp.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    router.push(`/dashboard/content/${postId}/comments?${next.toString()}`);
  }

  function refresh() {
    router.refresh();
    setSelected(new Set());
  }

  function runBulk(action: "publish" | "unpublish" | "delete") {
    if (selected.size === 0) return;
    setBulkError(null);
    startTransition(async () => {
      const r = await bulkModerate({ ids: Array.from(selected), action });
      if ("error" in r) {
        setBulkError(r.error);
      } else {
        const failed = r.results.filter((x) => !x.ok);
        if (failed.length > 0) {
          setBulkError(
            t("dashboard.content.commentsModeration.bulk.failed", {
              count: failed.length,
            }),
          );
        }
        refresh();
      }
    });
  }

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">
            {t("dashboard.content.commentsModeration.filters.status")}
          </label>
          <Select
            value={status}
            onValueChange={(v) => setParam("status", v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("dashboard.content.commentsModeration.filters.all")}
              </SelectItem>
              <SelectItem value="pending">
                {t("dashboard.content.commentsModeration.filters.pending")}
              </SelectItem>
              <SelectItem value="published">
                {t("dashboard.content.commentsModeration.filters.published")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setParam("q", searchInput.trim() || null);
          }}
        >
          <div className="space-y-1">
            <label className="text-xs font-medium">
              {t("dashboard.content.commentsModeration.filters.search")}
            </label>
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t(
                "dashboard.content.commentsModeration.filters.searchPlaceholder",
              )}
              className="w-[240px]"
            />
          </div>
          <Button type="submit" variant="outline">
            {t("dashboard.content.commentsModeration.filters.filter")}
          </Button>
        </form>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
          <span className="text-sm">
            {t("dashboard.common.selection.selectedCount", {
              count: selected.size,
            })}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => runBulk("publish")}
          >
            {t("dashboard.content.commentsModeration.actions.publish")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => runBulk("unpublish")}
          >
            {t("dashboard.content.commentsModeration.actions.unpublish")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => runBulk("delete")}
          >
            {t("dashboard.content.commentsModeration.actions.delete")}
          </Button>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {bulkError && (
            <span className="text-sm text-destructive">{bulkError}</span>
          )}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(c) => {
                  if (c) setSelected(new Set(rows.map((r) => r.id)));
                  else setSelected(new Set());
                }}
              />
            </TableHead>
            <TableHead>
              {t("dashboard.content.commentsModeration.table.author")}
            </TableHead>
            <TableHead>
              {t("dashboard.content.commentsModeration.table.body")}
            </TableHead>
            <TableHead>
              {t("dashboard.content.commentsModeration.table.status")}
            </TableHead>
            <TableHead>
              {t("dashboard.content.commentsModeration.table.type")}
            </TableHead>
            <TableHead>
              {t("dashboard.content.commentsModeration.table.created")}
            </TableHead>
            <TableHead className="text-right">
              {t("dashboard.content.commentsModeration.table.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center text-muted-foreground py-8"
              >
                {t("dashboard.content.commentsModeration.table.empty")}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={(c) => {
                      const next = new Set(selected);
                      if (c) next.add(r.id);
                      else next.delete(r.id);
                      setSelected(next);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{r.authorName}</div>
                  {r.authorId ? (
                    <div className="text-xs text-muted-foreground">
                      {t("dashboard.content.commentsModeration.table.signedIn")}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {t("dashboard.content.commentsModeration.table.guest")}
                    </div>
                  )}
                </TableCell>
                <TableCell className="max-w-md">
                  <p className="whitespace-pre-wrap text-sm">
                    {truncate(r.body)}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={r.status === "published" ? "default" : "secondary"}
                  >
                    {r.status === "published"
                      ? t(
                          "dashboard.content.commentsModeration.filters.published",
                        )
                      : t(
                          "dashboard.content.commentsModeration.filters.pending",
                        )}
                  </Badge>
                </TableCell>
                <TableCell>
                  {r.parentId ? (
                    <span className="text-xs">
                      <span className="font-medium">
                        {t(
                          "dashboard.content.commentsModeration.table.replyTo",
                          {
                            author: parentLookup[r.parentId] ?? "-",
                          },
                        )}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {t("dashboard.content.commentsModeration.table.topLevel")}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDateTime(r.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <CommentRowActions
                    commentId={r.id}
                    status={r.status as "pending" | "published"}
                    onMutated={refresh}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <TablePagination
        label={t.plural(
          "dashboard.content.commentsModeration.pagination.label",
          total,
          {
            count: total,
            page,
            totalPages,
          },
        )}
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={(nextPage) => setParam("page", String(nextPage))}
        onPageSizeChange={(nextPageSize) => {
          const next = new URLSearchParams(sp.toString());
          next.set("pageSize", String(nextPageSize));
          next.delete("page");
          router.push(
            `/dashboard/content/${postId}/comments?${next.toString()}`,
          );
        }}
      />
    </div>
  );
}
