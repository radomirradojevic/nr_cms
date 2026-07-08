"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
import { useSourceTranslations } from "@/components/source-translations";
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
import type { ContentStatus } from "@/lib/content-status";
import { batchDelete, batchSetStatus } from "./actions";

type Props = {
  ids: string[];
  canChangeWorkflowStatus: boolean;
  onCleared: () => void;
};

export function BatchActions({
  ids,
  canChangeWorkflowStatus,
  onCleared,
}: Props) {
  const t = useTranslations();
  const st = useSourceTranslations();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function setWorkflowStatus(status: ContentStatus, failureLabel: string) {
    setError(null);
    startTransition(async () => {
      const r = await batchSetStatus({ ids, status });
      if ("error" in r) setError(r.error);
      else {
        const failed = r.results.filter((x) => !x.ok);
        if (failed.length > 0) {
          setError(
            t("dashboard.content.errors.batchWorkflowFailed", {
              count: failed.length,
              action: failureLabel,
            }),
          );
        }
        onCleared();
      }
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
        setError(
          t("dashboard.content.errors.batchDeleteFailed", {
            count: failed.length,
          }),
        );
      }
      setOpen(false);
      onCleared();
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
      <span className="text-sm">
        {t("dashboard.common.selection.selectedCount", { count: ids.length })}
      </span>
      <div className="flex-1" />
      {canChangeWorkflowStatus && (
        <>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              setWorkflowStatus(
                "in_review",
                t("dashboard.content.workflowFailureAction.submitted"),
              )
            }
          >
            {t("dashboard.content.actions.submitForReview")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              setWorkflowStatus(
                "approved",
                t("dashboard.content.workflowFailureAction.approved"),
              )
            }
          >
            {t("dashboard.content.actions.approve")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              setWorkflowStatus(
                "published",
                t("dashboard.content.workflowFailureAction.published"),
              )
            }
          >
            {t("dashboard.content.actions.publishNow")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              setWorkflowStatus(
                "draft",
                t("dashboard.content.workflowFailureAction.movedToDraft"),
              )
            }
          >
            {t("dashboard.content.actions.moveToDraft")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              setWorkflowStatus(
                "archived",
                t("dashboard.content.workflowFailureAction.archived"),
              )
            }
          >
            {t("dashboard.content.actions.archive")}
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
            {t("dashboard.content.actions.moveToDeleted")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("dashboard.content.dialogs.deleteSelectedTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard.content.dialogs.deleteSelectedDescription", {
                count: ids.length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p className="text-sm text-destructive px-1">{st(error)}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {t("dashboard.common.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                doDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("dashboard.common.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && !open && (
        <span className="text-xs text-destructive ml-2">{st(error)}</span>
      )}
    </div>
  );
}
