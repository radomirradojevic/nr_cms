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
import { deleteGallery } from "./actions";

type Props = {
  id: string;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteGalleryDialog({ id, name, open, onOpenChange }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = await deleteGallery({ id });
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    toast.success("Gallery deleted.");
    onOpenChange(false);
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
          <AlertDialogTitle>Delete gallery?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the gallery{" "}
            <span className="font-medium">{name}</span>. The underlying images
            in the File Manager are not deleted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 px-1">
          <Label htmlFor="confirm-name">
            Type the gallery name to confirm:
          </Label>
          <Input
            id="confirm-name"
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
