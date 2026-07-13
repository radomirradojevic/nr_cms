"use client";

import { useState, useTransition } from "react";
import {
  Loader2,
  MoreHorizontal,
  Trash2,
  CheckCircle2,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  setCommentStatus,
  deleteComment,
} from "@/app/dashboard/content/comment-actions";
import { useTranslations } from "@/components/i18n-provider";

type Props = {
  commentId: string;
  status: "pending" | "published";
  onMutated: () => void;
};

export function CommentRowActions({ commentId, status, onMutated }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations();

  function run(fn: () => Promise<{ error?: string; success?: boolean }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
      else onMutated();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
            <span className="sr-only">
              {t("dashboard.content.commentsModeration.table.actions")}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>
            {t("dashboard.content.commentsModeration.table.actions")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {status !== "published" && (
            <DropdownMenuItem
              onClick={() =>
                run(() =>
                  setCommentStatus({ id: commentId, status: "published" }),
                )
              }
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t("dashboard.content.commentsModeration.actions.publish")}
            </DropdownMenuItem>
          )}
          {status === "published" && (
            <DropdownMenuItem
              onClick={() =>
                run(() =>
                  setCommentStatus({ id: commentId, status: "pending" }),
                )
              }
            >
              <EyeOff className="mr-2 h-4 w-4" />
              {t("dashboard.content.commentsModeration.actions.unpublish")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("dashboard.content.commentsModeration.actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {error && (
        <p className="text-xs text-destructive mt-1 max-w-[240px] text-right">
          {error}
        </p>
      )}

      <AlertDialog
        open={confirmDelete}
        onOpenChange={(o) => {
          setConfirmDelete(o);
          if (!o) setError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("dashboard.content.commentsModeration.dialogs.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "dashboard.content.commentsModeration.dialogs.deleteDescription",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-destructive px-1">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {t("dashboard.content.commentsModeration.dialogs.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                run(async () => {
                  const r = await deleteComment({ id: commentId });
                  if (!("error" in r)) setConfirmDelete(false);
                  return r;
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("dashboard.content.commentsModeration.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
