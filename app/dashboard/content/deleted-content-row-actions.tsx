"use client";

import { useState, useTransition } from "react";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { hasRole, type Role } from "@/lib/roles";

import { permanentlyDeleteContent, restoreDeletedContent } from "./actions";
import type { ContentRow } from "./content-table";

type Props = {
  row: ContentRow;
  currentUserRoles: Role[];
  onMutated: () => void;
};

export function DeletedContentRowActions({
  row,
  currentUserRoles,
  onMutated,
}: Props) {
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isAdmin = hasRole(currentUserRoles, "admin");
  const canRestore = isAdmin || row.contentType !== "webshop";

  function run(action: () => Promise<{ error?: string; success?: boolean }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      setRestoreOpen(false);
      setDeleteOpen(false);
      onMutated();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-2">
        {canRestore && (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              setError(null);
              setRestoreOpen(true);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Restore
          </Button>
        )}
        {isAdmin && (
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => {
              setError(null);
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}
      </div>
      {error && (
        <p className="max-w-[260px] text-xs text-destructive">{error}</p>
      )}

      <AlertDialog
        open={restoreOpen}
        onOpenChange={(open) => {
          setRestoreOpen(open);
          if (!open) setError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this deleted content?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{row.title}</span> will be moved
              back to regular content with its revision history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="px-1 text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                run(() => restoreDeletedContent({ id: row.id }));
              }}
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Permanently delete this content?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete <span className="font-medium">{row.title}</span>,
              comments, and all revision history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="px-1 text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                run(() => permanentlyDeleteContent({ id: row.id }));
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Permanently delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
