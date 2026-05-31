"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { bulkDeleteFiles } from "./actions";

type Props = {
  ids: string[];
  label?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (ids: string[]) => void;
};

export function DeleteFileDialog({
  ids,
  label,
  open,
  onOpenChange,
  onDeleted,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = await bulkDeleteFiles({ ids });
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    onDeleted(ids);
    onOpenChange(false);
  }

  const count = ids.length;
  const target = count === 1 ? (label ?? "this file") : `${count} files`;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {count === 1 ? "file" : `${count} files`}?
          </AlertDialogTitle>
          <AlertDialogDescription className="max-w-full">
            You are about to permanently delete{" "}
            <span className="font-medium">{target}</span>. References to{" "}
            {count === 1 ? "this file" : "these files"} inside content items
            will also be removed. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && <p className="text-sm text-destructive px-1">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
