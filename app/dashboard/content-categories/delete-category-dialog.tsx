"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { deleteCategory } from "@/app/dashboard/content-categories/actions";
import { useTranslations } from "@/components/i18n-provider";

type Props = {
  category: {
    id: string;
    name: string;
  };
  onSuccess?: () => void;
};

export function DeleteCategoryDialog({ category, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const t = useTranslations();

  async function handleDelete() {
    setLoading(true);
    setServerError(null);
    const result = await deleteCategory({ id: category.id });
    setLoading(false);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    setOpen(false);
    onSuccess?.();
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setServerError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 className="h-4 w-4 text-destructive" />
          <span className="sr-only">
            {t("dashboard.contentCategories.actions.delete")}
          </span>
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("dashboard.contentCategories.dialogs.deleteTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("dashboard.contentCategories.dialogs.deleteDescription", {
              name: category.name,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {serverError && (
          <p className="text-sm text-destructive px-1">{serverError}</p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {t("dashboard.contentCategories.actions.cancel")}
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
            {t("dashboard.contentCategories.actions.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
