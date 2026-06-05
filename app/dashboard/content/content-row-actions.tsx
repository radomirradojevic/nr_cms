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
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPending, setPreviewPending] = useState(false);

  const isAdmin = hasRole(currentUserRoles, "admin");
  const isPublisher = hasRole(currentUserRoles, "publisher");
  const isOwn = row.authorId === currentUserId;
  const isAuthorOnly = isAuthorOnlyContentWorkflowRole(currentUserRoles);

  // Conservative client-side gating; server re-checks on each call.
  const canEdit =
    isAdmin ||
    isPublisher ||
    (isOwn &&
      (!isAuthorOnly ||
        canAuthorEditOwnContentStatus(currentUserRoles, row.status)));
  const canReviewStatus = isAdmin || isPublisher;
  const canSubmitOwnDraft =
    isOwn && (row.status === "draft" || row.status === "in_review");
  const canPreview = isAdmin || isPublisher || isOwn;
  const canDelete = canEdit;
  const canSetHome = isAdmin && row.contentType === "page";
  const rowIsLive = isContentLive(row);
  const lockError = row.editLock
    ? `Currently being edited by ${row.editLock.userDisplayName}. Wait until the current editor closes the page.`
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
      setError("Archived content cannot be previewed.");
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
            : "Preview link could not be created.",
        );
        return;
      }

      const previewUrl =
        typeof data?.previewUrl === "string" ? data.previewUrl : "";
      if (!previewUrl) {
        setError("Preview link could not be created.");
        return;
      }

      window.open(previewUrl, "_blank", "noopener,noreferrer");
    } catch {
      setError("Preview link could not be created.");
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
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {row.editLock && (
            <>
              <DropdownMenuItem
                disabled
                className="whitespace-normal text-muted-foreground"
              >
                <Lock className="mr-2 h-4 w-4 shrink-0" />
                Locked by {row.editLock.userDisplayName}
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
              Preview
            </DropdownMenuItem>
          )}
          {(canReviewStatus || canSubmitOwnDraft) && row.status === "draft" && (
            <DropdownMenuItem
              disabled={actionDisabled}
              onClick={() => changeStatus("in_review")}
            >
              Submit for review
            </DropdownMenuItem>
          )}
          {(canReviewStatus || canSubmitOwnDraft) &&
            row.status === "in_review" && (
              <DropdownMenuItem
                disabled={actionDisabled}
                onClick={() => changeStatus("draft")}
              >
                Return to draft
              </DropdownMenuItem>
            )}
          {canReviewStatus &&
            (row.status === "approved" || row.status === "archived") && (
              <DropdownMenuItem
                disabled={actionDisabled}
                onClick={() => changeStatus("draft")}
              >
                Move to draft
              </DropdownMenuItem>
            )}
          {canReviewStatus &&
            (row.status === "draft" || row.status === "in_review") && (
              <DropdownMenuItem
                disabled={actionDisabled}
                onClick={() => changeStatus("approved")}
              >
                Approve
              </DropdownMenuItem>
            )}
          {canReviewStatus && row.status !== "published" && (
            <DropdownMenuItem
              disabled={actionDisabled}
              onClick={() => changeStatus("published")}
            >
              Publish now
            </DropdownMenuItem>
          )}
          {canReviewStatus && row.status === "published" && (
            <DropdownMenuItem
              disabled={actionDisabled}
              onClick={() => changeStatus("draft")}
            >
              Unpublish to draft
            </DropdownMenuItem>
          )}
          {canReviewStatus && row.status !== "archived" && (
            <DropdownMenuItem
              disabled={actionDisabled}
              onClick={() => changeStatus("archived")}
            >
              Archive
            </DropdownMenuItem>
          )}
          {canSetHome && !row.homepage && rowIsLive && (
            <DropdownMenuItem
              disabled={actionDisabled}
              onClick={() => run(() => setHomepage({ id: row.id }))}
            >
              <Star className="mr-2 h-4 w-4" />
              Set as homepage
            </DropdownMenuItem>
          )}
          {isAdmin && (
            <DropdownMenuItem
              disabled={actionDisabled}
              onClick={openReassignDialog}
            >
              <UserRoundCog className="mr-2 h-4 w-4" />
              Reassign author
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
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {error && (
        <p className="text-xs text-destructive mt-1 max-w-[240px] text-right">
          {error}
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
            <AlertDialogTitle>Delete this content?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{row.title}</span> will be
              permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-destructive px-1">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
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
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
