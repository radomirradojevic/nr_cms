"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Pencil, Star } from "lucide-react";
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
import { PageSizeSelector } from "@/app/dashboard/page-size-selector";
import { type Role, hasRole } from "@/lib/roles";
import { ContentRowActions } from "./content-row-actions";
import { BatchActions } from "./batch-actions";

type AllowedPageSize = 10 | 20 | 30;

export type ContentRow = {
  id: string;
  contentType: "page" | "blog_post";
  categoryId: string;
  categoryName: string;
  title: string;
  slug: string;
  status: "published" | "unpublished" | "archived";
  homepage: boolean;
  authorId: string;
  authorName: string;
  updatedAt: string;
  publishedAt: string | null;
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
};

const statusVariant: Record<
  ContentRow["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  published: "default",
  unpublished: "secondary",
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
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected =
    rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(rows.map((r) => r.id)) : new Set());
  }
  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const isAdmin = hasRole(currentUserRoles, "admin");
  const isPublisher = hasRole(currentUserRoles, "publisher");
  const canPublishAny = isAdmin || isPublisher;

  return (
    <div className="space-y-3">
      {someSelected && (
        <BatchActions
          ids={Array.from(selectedIds)}
          canPublish={canPublishAny}
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
          No content found.
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(c) => toggleAll(!!c)}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={selectedIds.has(row.id) ? "selected" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(row.id)}
                      onCheckedChange={(c) => toggleOne(row.id, !!c)}
                      aria-label={`Select ${row.title}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/content/${row.id}/edit`}
                        className="hover:underline"
                      >
                        {row.title}
                      </Link>
                      {row.homepage && (
                        <Badge variant="outline" className="gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          Homepage
                        </Badge>
                      )}
                    </div>
                    <a
                      href={`/${row.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground mt-0.5 hover:underline"
                    >
                      /{row.slug}
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {row.contentType === "page" ? "Page" : "Blog post"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{row.categoryName}</TableCell>
                  <TableCell className="text-sm">{row.authorName}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[row.status]}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(row.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/content/${row.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Link>
                      </Button>
                      <ContentRowActions
                        row={row}
                        currentUserId={currentUserId}
                        currentUserRoles={currentUserRoles}
                        onMutated={onMutated}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {safePage} of {totalPages} &mdash; {total} total
            </p>
            <div className="flex items-center gap-4">
              <PageSizeSelector
                pageSize={pageSize}
                onChange={(s) => onPageSizeChange(s as AllowedPageSize)}
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => onPageChange(safePage - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => onPageChange(safePage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
