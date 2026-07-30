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
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/components/i18n-provider";
import { useSourceTranslations } from "@/components/source-translations";
import { hasRole, type Role } from "@/lib/roles";
import { WEBSHOP_HARD_DELETE_CONFIRMATION } from "@/lib/webshop-hard-delete";

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
  const t = useTranslations();
  const st = useSourceTranslations();
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isAdmin = hasRole(currentUserRoles, "admin");
  const isWebshop = row.contentType === "webshop";
  const canRestore = isAdmin || row.contentType !== "webshop";
  const deleteConfirmationMatches =
    !isWebshop ||
    deleteConfirmation.trim() === WEBSHOP_HARD_DELETE_CONFIRMATION;

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
      setDeleteConfirmation("");
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
            {t("dashboard.content.actions.restore")}
          </Button>
        )}
        {isAdmin && (
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => {
              setError(null);
              setDeleteConfirmation("");
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
            {t("dashboard.common.actions.delete")}
          </Button>
        )}
      </div>
      {error && (
        <p className="max-w-[260px] text-xs text-destructive">{st(error)}</p>
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
            <AlertDialogTitle>
              {t("dashboard.content.dialogs.restoreTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard.content.dialogs.restoreDescription", {
                title: row.title,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p className="px-1 text-sm text-destructive">{st(error)}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {t("dashboard.common.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                run(() => restoreDeletedContent({ id: row.id }));
              }}
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("dashboard.content.actions.restore")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setError(null);
            setDeleteConfirmation("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isWebshop
                ? t("dashboard.content.dialogs.webshopPermanentlyDeleteTitle")
                : t("dashboard.content.dialogs.permanentlyDeleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isWebshop
                ? t(
                    "dashboard.content.dialogs.webshopPermanentlyDeleteDescription",
                    { title: row.title },
                  )
                : t("dashboard.content.dialogs.permanentlyDeleteDescription", {
                    title: row.title,
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isWebshop && (
            <div className="space-y-2">
              <label
                htmlFor={`webshop-delete-confirmation-${row.id}`}
                className="text-sm font-medium"
              >
                {t(
                  "dashboard.content.dialogs.webshopPermanentlyDeleteConfirmation",
                  { phrase: WEBSHOP_HARD_DELETE_CONFIRMATION },
                )}
              </label>
              <Input
                id={`webshop-delete-confirmation-${row.id}`}
                value={deleteConfirmation}
                onChange={(event) =>
                  setDeleteConfirmation(event.currentTarget.value)
                }
                autoComplete="off"
                disabled={pending}
                spellCheck={false}
                aria-invalid={
                  deleteConfirmation.length > 0 && !deleteConfirmationMatches
                }
              />
            </div>
          )}
          {error && (
            <p className="px-1 text-sm text-destructive">{st(error)}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {t("dashboard.common.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={pending || !deleteConfirmationMatches}
              onClick={(event) => {
                event.preventDefault();
                run(() =>
                  permanentlyDeleteContent({
                    id: row.id,
                    confirmation: isWebshop ? deleteConfirmation : undefined,
                  }),
                );
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("dashboard.content.actions.permanentlyDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
