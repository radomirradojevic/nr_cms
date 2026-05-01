"use client";

import { useState } from "react";
import Link from "next/link";
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
import { CreateLinkDialog } from "@/app/dashboard/create-link-dialog";
import { EditLinkDialog } from "@/app/dashboard/edit-link-dialog";
import { DeleteLinkDialog } from "@/app/dashboard/delete-link-dialog";
import { PageSizeSelector } from "@/app/dashboard/page-size-selector";
import { deleteLinks } from "@/app/dashboard/actions";

const ALLOWED_PAGE_SIZES = [10, 20, 30] as const;
type AllowedPageSize = (typeof ALLOWED_PAGE_SIZES)[number];

type LinkRow = {
  id: number;
  shortCode: string;
  originalUrl: string;
  createdAt: Date;
};

type Props = {
  links: LinkRow[];
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

export function LinksTable({
  links,
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const allSelected =
    links.length > 0 && links.every((l) => selectedIds.has(l.id));
  const someSelected = selectedIds.size > 0;

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(links.map((l) => l.id)) : new Set());
  }

  function toggleOne(id: number, checked: boolean) {
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
    await deleteLinks({ ids: Array.from(selectedIds) });
    setSelectedIds(new Set());
    setBulkDeleting(false);
    setBulkDialogOpen(false);
    onMutated();
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          Your Links{" "}
          <span className="text-muted-foreground text-lg font-normal">
            ({total})
          </span>
        </h1>
        <div className="flex items-center gap-2">
          {someSelected && (
            <AlertDialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Delete selected ({selectedIds.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete selected links?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {selectedIds.size} selected{" "}
                    {selectedIds.size === 1 ? "link" : "links"}. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
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
          <CreateLinkDialog onSuccess={onMutated} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : total === 0 ? (
        <p className="text-muted-foreground">
          {query ? "No links match your search." : "You have no links yet."}
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
                <TableHead>Short Code</TableHead>
                <TableHead>Original URL</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow
                  key={link.id}
                  data-state={selectedIds.has(link.id) ? "selected" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(link.id)}
                      onCheckedChange={(checked) =>
                        toggleOne(link.id, !!checked)
                      }
                      aria-label={`Select ${link.shortCode}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono">
                    <Link
                      href={`/l/${link.shortCode}`}
                      className="hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.shortCode}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {link.originalUrl}
                  </TableCell>
                  <TableCell>{link.createdAt.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <EditLinkDialog link={link} onSuccess={onMutated} />
                      <DeleteLinkDialog link={link} onSuccess={onMutated} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {safePage} of {totalPages} &mdash; {total} total links
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
