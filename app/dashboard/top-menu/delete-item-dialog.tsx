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
import { useSourceTranslations } from "@/components/source-translations";
import { deleteMenuItem } from "./actions";

type Props = {
  menuId: string;
  item: { id: string; label: string };
  childCount?: number;
  onSuccess?: () => void;
  disabled?: boolean;
  clientId?: string;
};

export function DeleteItemDialog({
  menuId,
  item,
  childCount = 0,
  onSuccess,
  disabled,
  clientId,
}: Props) {
  const st = useSourceTranslations();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setServerError(null);
    const result = await deleteMenuItem({ menuId, id: item.id }, clientId);
    setLoading(false);
    if ("error" in result && result.error) {
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
        <Button variant="ghost" size="sm" disabled={disabled}>
          <Trash2 className="h-4 w-4 text-destructive" />
          <span className="sr-only">{st("Delete")}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{st("Delete menu item?")}</AlertDialogTitle>
          <AlertDialogDescription>
            {childCount > 0
              ? st(
                  "This will permanently delete {label} and all {count} nested items. This action cannot be undone.",
                  { count: childCount, label: item.label },
                )
              : st(
                  "This will permanently delete {label}. This action cannot be undone.",
                  { label: item.label },
                )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {serverError && (
          <p className="text-sm text-destructive px-1">{st(serverError)}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {st("Cancel")}
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
            {st("Delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
