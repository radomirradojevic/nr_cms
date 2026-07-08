"use client";

import { useState, useTransition } from "react";
import {
  Eye,
  Lock,
  Loader2,
  MoreHorizontal,
  Trash2,
  Star,
  UserRoundCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
import { useSourceTranslations } from "@/components/source-translations";
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
import { hasRole, type Role } from "@/lib/roles";
import {
  canAuthorEditOwnContentStatus,
  isAuthorOnlyContentWorkflowRole,
  type ContentStatus,
} from "@/lib/content-status";
import { isContentLive } from "@/lib/content-schedule";
import { deleteContent, setHomepage, setStatus } from "./actions";
import type { ContentRow } from "./content-table";
import { ContentReassignDialog } from "./content-reassign-dialog";

type Props = {
  row: ContentRow;
  currentUserId: string;
  currentUserRoles: Role[];
  onMutated: () => void;
};

export function ContentRowActions({
  row,
  currentUserId,
  currentUserRoles,
  onMutated,
}: Props) {
  const t = useTranslations();
  const st = useSourceTranslations();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPending, setPreviewPending] = useState(false);

  const isAdmin = hasRole(currentUserRoles, "admin");
  const isPublisher = hasRole(currentUserRoles, "publisher");
  const isOwn = row.authorId === currentUserId;
  const isAuthorOnly = isAuthorOnlyContentWorkflowRole(currentUserRoles);
  const isWebshop = row.contentType === "webshop";

  // Conservative client-side gating; server re-checks on each call.
  const canEdit =
    isAdmin ||
    (!isWebshop &&
      (isPublisher ||
        (isOwn &&
          (!isAuthorOnly ||
            canAuthorEditOwnContentStatus(currentUserRoles, row.status)))));
  const canReviewStatus = isAdmin || (!isWebshop && isPublisher);
  const canSubmitOwnDraft =
    !isWebshop &&
    isOwn &&
    (row.status === "draft" || row.status === "in_review");
  const canPreview = isAdmin || (!isWebshop && (isPublisher || isOwn));
  const canDelete = canEdit;
  const canSetHome = isAdmin && row.contentType === "page";
  const rowIsLive = isContentLive(row);
  const lockError = row.editLock
    ? t("dashboard.content.errors.rowLocked", {
        name: row.editLock.userDisplayName,
      })
    : null;
  const actionDisabled = pending || Boolean(lockError);

  function run(fn: () => Promise<{ error?: string; success?: boolean }>) {
    setError(null);
    if (lockError) {
      setError(lockError);
      return;
    }
    startTransition(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
      else onMutated();
    });
  }

  function changeStatus(status: ContentStatus) {
    run(() => setStatus({ id: row.id, status }));
  }

  async function openPreview() {
    setError(null);
    if (row.status === "archived") {
      setError(t("dashboard.content.errors.archivedPreviewUnavailable"));
      return;
    }

    setPreviewPending(true);
    try {
      const response = await fetch("/api/content-preview-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ contentId: row.id }),
      });
      const data = (await response.json().catch(() => null)) as {
        previewUrl?: unknown;
        error?: unknown;
      } | null;

      if (!response.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : t("dashboard.content.errors.previewLinkFailed"),
        );
        return;
      }

      const previewUrl =
        typeof data?.previewUrl === "string" ? data.previewUrl : "";
      if (!previewUrl) {
        setError(t("dashboard.content.errors.previewLinkFailed"));
        return;
      }

      window.open(previewUrl, "_blank", "noopener,noreferrer");
    } catch {
      setError(t("dashboard.content.errors.previewLinkFailed"));
    } finally {
      setPreviewPending(false);
    }
  }

  function openReassignDialog() {
    setError(null);
    if (lockError) {
      setError(lockError);
      return;
    }
    setReassignOpen(true);
  }

  function openDeleteDialog() {
    setError(null);
    if (lockError) {
      setError(lockError);
      return;
    }
    setConfirmDelete(true);
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
              {t("dashboard.common.table.actions")}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            {t("dashboard.common.table.actions")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {row.editLock && (
            <>
              <DropdownMenuItem
                disabled
                className="whitespace-normal text-muted-foreground"
              >
                <Lock className="mr-2 h-4 w-4 shrink-0" />
                {t("dashboard.content.table.lockBadge", {
                  name: row.editLock.userDisplayName,
                })}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {canPreview && (
            <DropdownMenuItem
              disabled={previewPending || row.status === "archived"}
              onClick={openPreview}
            >
              {previewPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              {t("dashboard.content.actions.preview")}
            </DropdownMenuItem>
          )}
          {(canReviewStatus || canSubmitOwnDraft) && row.status === "draft" && (
            <DropdownMenuItem
              disabled={actionDisabled}
              onClick={() => changeStatus("in_review")}
            >
              {t("dashboard.content.actions.submitForReview")}
            </DropdownMenuItem>
          )}
          {(canReviewStatus || canSubmitOwnDraft) &&
            row.status === "in_review" && (
              <DropdownMenuItem
                disabled={actionDisabled}
                onClick={() => changeStatus("draft")}
              >
                {t("dashboard.content.actions.returnToDraft")}
              </DropdownMenuItem>
            )}
          {canReviewStatus &&
            (row.status === "approved" || row.status === "archived") && (
              <DropdownMenuItem
                disabled={actionDisabled}
                onClick={() => changeStatus("draft")}
              >
                {t("dashboard.content.actions.moveToDraft")}
              </DropdownMenuItem>
            )}
          {canReviewStatus &&
            (row.status === "draft" || row.status === "in_review") && (
              <DropdownMenuItem
                disabled={actionDisabled}
                onClick={() => changeStatus("approved")}
              >
                {t("dashboard.content.actions.approve")}
              </DropdownMenuItem>
            )}
          {canReviewStatus && row.status !== "published" && (
            <DropdownMenuItem
              disabled={actionDisabled}
              onClick={() => changeStatus("published")}
            >
              {t("dashboard.content.actions.publishNow")}
            </DropdownMenuItem>
          )}
          {canReviewStatus && row.status === "published" && (
            <DropdownMenuItem
              disabled={actionDisabled}
              onClick={() => changeStatus("draft")}
            >
              {t("dashboard.content.actions.unpublishToDraft")}
            </DropdownMenuItem>
          )}
          {canReviewStatus && row.status !== "archived" && (
            <DropdownMenuItem
              disabled={actionDisabled}
              onClick={() => changeStatus("archived")}
            >
              {t("dashboard.content.actions.archive")}
            </DropdownMenuItem>
          )}
          {canSetHome && !row.homepage && rowIsLive && (
            <DropdownMenuItem
              disabled={actionDisabled}
              onClick={() => run(() => setHomepage({ id: row.id }))}
            >
              <Star className="mr-2 h-4 w-4" />
              {t("dashboard.content.actions.setHomepage")}
            </DropdownMenuItem>
          )}
          {isAdmin && (
            <DropdownMenuItem
              disabled={actionDisabled}
              onClick={openReassignDialog}
            >
              <UserRoundCog className="mr-2 h-4 w-4" />
              {t("dashboard.content.actions.reassignAuthor")}
            </DropdownMenuItem>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                disabled={actionDisabled}
                onClick={openDeleteDialog}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("dashboard.content.actions.moveToDeleted")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {error && (
        <p className="text-xs text-destructive mt-1 max-w-[240px] text-right">
          {st(error)}
        </p>
      )}

      <ContentReassignDialog
        row={row}
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        onMutated={onMutated}
      />

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
              {t("dashboard.content.dialogs.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard.content.dialogs.deleteDescription", {
                title: row.title,
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
              disabled={actionDisabled}
              onClick={(e) => {
                e.preventDefault();
                run(async () => {
                  const r = await deleteContent({ id: row.id });
                  if (!r.error) setConfirmDelete(false);
                  return r;
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("dashboard.content.actions.moveToDeleted")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
