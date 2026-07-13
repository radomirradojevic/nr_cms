"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteForm } from "./actions";
import { translateFormBuilderError } from "./form-error-message";

type Props = {
  id: string;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (id: string) => void;
};

export function DeleteFormDialog({
  id,
  name,
  open,
  onOpenChange,
  onDeleted,
}: Props) {
  const t = useTranslations();
  const st = useSourceTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const res = await deleteForm({ id });
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    toast.success(t("dashboard.toasts.formDeleted"));
    onOpenChange(false);
    onDeleted?.(id);
    router.refresh();
  }

  const canDelete = confirm.trim() === name;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setConfirm("");
          setError(null);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("dashboard.forms.deleteTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("dashboard.forms.deleteDescription", { name })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 px-1">
          <Label htmlFor="confirm-form-name">
            {t("dashboard.forms.confirmName")}
          </Label>
          <Input
            id="confirm-form-name"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={name}
          />
          {error && (
            <p className="text-sm text-destructive">
              {translateFormBuilderError(st, error)}
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {t("dashboard.common.actions.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (canDelete) handleDelete();
            }}
            disabled={loading || !canDelete}
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
