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
import { PageSizeSelector } from "@/app/dashboard/page-size-selector";
import { CreateCategoryDialog } from "./create-category-dialog";
import { EditCategoryDialog } from "./edit-category-dialog";
import { DeleteCategoryDialog } from "./delete-category-dialog";
import { deleteCategories } from "./actions";

const ALLOWED_PAGE_SIZES = [10, 20, 30] as const;
type AllowedPageSize = (typeof ALLOWED_PAGE_SIZES)[number];

type CategoryRow = {
  id: string;
  name: string;
  contentType: string;
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

  const label = contentType === "page" ? "Page" : "Blog Post";

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">
          {label} Categories{" "}
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
                  Delete selected ({selectedIds.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete selected categories?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {selectedIds.size} selected{" "}
                    {selectedIds.size === 1 ? "category" : "categories"}. This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {bulkError && (
                  <p className="text-sm text-destructive px-1">{bulkError}</p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={bulkDeleting}>
                    Cancel
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
                    Delete
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
            ? `No ${label.toLowerCase()} categories match your search.`
            : `No ${label.toLowerCase()} categories yet.`}
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
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                      aria-label={`Select ${category.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
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
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {safePage} of {totalPages} &mdash; {total} total
            </p>
            <div className="flex items-center gap-4">
              <PageSizeSelector
                pageSize={pageSize}
                onChange={onPageSizeChange}
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
    </>
  );
}
