"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
    toast.success("Form deleted.");
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
          <AlertDialogTitle>Delete form?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the form{" "}
            <span className="font-medium">{name}</span> and all of its
            submissions. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 px-1">
          <Label htmlFor="confirm-form-name">
            Type the form name to confirm:
          </Label>
          <Input
            id="confirm-form-name"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={name}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (canDelete) handleDelete();
            }}
            disabled={loading || !canDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
