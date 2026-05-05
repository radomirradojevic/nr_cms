"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { batchDelete, batchSetStatus } from "./actions";

type Props = {
  ids: string[];
  canPublish: boolean;
  onCleared: () => void;
};

export function BatchActions({ ids, canPublish, onCleared }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function publish() {
    setError(null);
    startTransition(async () => {
      const r = await batchSetStatus({ ids, status: "published" });
      if ("error" in r) setError(r.error);
      else {
        const failed = r.results.filter((x) => !x.ok);
        if (failed.length > 0) {
          setError(`${failed.length} item(s) could not be published.`);
        }
        onCleared();
      }
    });
  }
  function unpublish() {
    setError(null);
    startTransition(async () => {
      const r = await batchSetStatus({ ids, status: "unpublished" });
      if ("error" in r) setError(r.error);
      else onCleared();
    });
  }
  function doDelete() {
    setError(null);
    startTransition(async () => {
      const r = await batchDelete({ ids });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      const failed = r.results.filter((x) => !x.ok);
      if (failed.length > 0) {
        setError(`${failed.length} item(s) could not be deleted.`);
      }
      setOpen(false);
      onCleared();
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
      <span className="text-sm">{ids.length} selected</span>
      <div className="flex-1" />
      {canPublish && (
        <>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={publish}
          >
            Publish
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={unpublish}
          >
            Unpublish
          </Button>
        </>
      )}
      <AlertDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setError(null);
        }}
      >
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={pending}>
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected content?</AlertDialogTitle>
            <AlertDialogDescription>
              {ids.length} item(s) will be permanently deleted. Items you do not
              have permission to delete or that are the homepage will be
              skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-destructive px-1">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                doDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && !open && (
        <span className="text-xs text-destructive ml-2">{error}</span>
      )}
    </div>
  );
}
