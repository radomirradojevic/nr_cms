"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "@/components/i18n-provider";
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
  const t = useTranslations();
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
  const target =
    count === 1
      ? (label ?? t("dashboard.files.delete.thisFile"))
      : t("dashboard.files.delete.filesTarget", { count });
  const reference =
    count === 1
      ? t("dashboard.files.delete.thisFile")
      : t("dashboard.files.delete.theseFiles");

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
            {count === 1
              ? t("dashboard.files.delete.fileTitle")
              : t("dashboard.files.delete.filesTitle", { count })}
          </AlertDialogTitle>
          <AlertDialogDescription className="max-w-full">
            {t("dashboard.files.delete.description", { target, reference })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && <p className="text-sm text-destructive px-1">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {t("dashboard.common.actions.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("dashboard.common.actions.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
