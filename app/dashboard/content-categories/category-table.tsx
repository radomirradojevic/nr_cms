"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { TablePagination } from "@/app/dashboard/table-pagination";
import { useTranslations } from "@/components/i18n-provider";
import { useRegionalSettings } from "@/components/regional-settings-provider";
import { CreateCategoryDialog } from "./create-category-dialog";
import { EditCategoryDialog } from "./edit-category-dialog";
import { DeleteCategoryDialog } from "./delete-category-dialog";
import { deleteCategories } from "./actions";

type AllowedPageSize = 10 | 20 | 30 | 50 | 100;

type CategoryRow = {
  id: string;
  name: string;
  contentType: string;
  createdBy: string | null;
  createdByName: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
  created: string;
  updated: string;
  itemCount: number;
};

type Props = {
  contentType: "page" | "blog_post";
  categories: CategoryRow[];
  total: number;
  loading: boolean;
  safePage: number;
  totalPages: number;
  query: string;
  pageSize: AllowedPageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: AllowedPageSize) => void;
  onMutated: () => void;
};

export function CategoryTable({
  contentType,
  categories,
  total,
  loading,
  safePage,
  totalPages,
  query,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onMutated,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const t = useTranslations();
  const { formatDate, formatDateTime } = useRegionalSettings();

  const allSelected =
    categories.length > 0 && categories.every((c) => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0;

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(categories.map((c) => c.id)) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    setBulkError(null);
    const result = await deleteCategories({ ids: Array.from(selectedIds) });
    setBulkDeleting(false);

    if (result.error) {
      setBulkError(result.error);
      return;
    }

    setSelectedIds(new Set());
    setBulkDialogOpen(false);
    onMutated();
  }

  const label =
    contentType === "page"
      ? t("dashboard.contentCategories.types.page")
      : t("dashboard.contentCategories.types.blogPost");
  const lowercaseLabel =
    contentType === "page"
      ? t("dashboard.contentCategories.types.pageLower")
      : t("dashboard.contentCategories.types.blogPostLower");

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">
          {t("dashboard.contentCategories.table.title", { type: label })}{" "}
          <span className="text-muted-foreground text-base font-normal">
            ({total})
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {someSelected && (
            <AlertDialog
              open={bulkDialogOpen}
              onOpenChange={(next) => {
                setBulkDialogOpen(next);
                if (!next) setBulkError(null);
              }}
            >
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  {t("dashboard.contentCategories.dialogs.deleteSelected", {
                    count: selectedIds.size,
                  })}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t(
                      "dashboard.contentCategories.dialogs.deleteSelectedTitle",
                    )}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.plural(
                      "dashboard.contentCategories.dialogs.deleteSelectedDescription",
                      selectedIds.size,
                      { count: selectedIds.size },
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {bulkError && (
                  <p className="text-sm text-destructive px-1">{bulkError}</p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={bulkDeleting}>
                    {t("dashboard.contentCategories.actions.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      handleBulkDelete();
                    }}
                    disabled={bulkDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {bulkDeleting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t("dashboard.contentCategories.actions.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <CreateCategoryDialog
            contentType={contentType}
            onSuccess={onMutated}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : total === 0 ? (
        <p className="text-muted-foreground text-sm">
          {query
            ? t("dashboard.contentCategories.table.emptySearch", {
                type: lowercaseLabel,
              })
            : t("dashboard.contentCategories.table.empty", {
                type: lowercaseLabel,
              })}
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => toggleAll(!!checked)}
                    aria-label={t(
                      "dashboard.contentCategories.table.selectAll",
                    )}
                  />
                </TableHead>
                <TableHead>
                  {t("dashboard.contentCategories.table.name")}
                </TableHead>
                <TableHead>
                  {t("dashboard.contentCategories.table.items")}
                </TableHead>
                <TableHead>
                  {t("dashboard.contentCategories.table.author")}
                </TableHead>
                <TableHead>
                  {t("dashboard.contentCategories.table.updated")}
                </TableHead>
                <TableHead className="text-right">
                  {t("dashboard.contentCategories.table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow
                  key={category.id}
                  data-state={
                    selectedIds.has(category.id) ? "selected" : undefined
                  }
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(category.id)}
                      onCheckedChange={(checked) =>
                        toggleOne(category.id, !!checked)
                      }
                      aria-label={t(
                        "dashboard.contentCategories.table.selectCategory",
                        { name: category.name },
                      )}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {category.itemCount}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {category.createdByName ?? (
                      <span className="italic">—</span>
                    )}
                    <div className="mt-0.5">{formatDate(category.created)}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>{formatDateTime(category.updated)}</div>
                    <div className="mt-0.5">
                      {t("dashboard.contentCategories.table.updatedBy", {
                        name:
                          category.updatedByName ??
                          t("dashboard.common.meta.unknown"),
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <EditCategoryDialog
                        category={category}
                        onSuccess={onMutated}
                      />
                      <DeleteCategoryDialog
                        category={category}
                        onSuccess={onMutated}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
    </>
  );
}
