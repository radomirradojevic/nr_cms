"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { BackendUserCombobox } from "@/app/dashboard/_components/backend-user-combobox";
import type { BackendUserOption } from "@/lib/backend-user-types";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { GalleryListItem } from "@/data/galleries";
import { reassignGallery } from "./actions";

type Props = {
  gallery: GalleryListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReassigned: (id: string, newOwnerId: string, newOwnerName: string) => void;
};

export function ReassignGalleryDialog({
  gallery,
  open,
  onOpenChange,
  onReassigned,
}: Props) {
  const t = useTranslations();
  const [selectedUser, setSelectedUser] = useState<BackendUserOption | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setSelectedUser(null);
      setError(null);
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) {
      setError(t("dashboard.galleries.reassignDialog.selectUser"));
      return;
    }

    setError(null);
    setSubmitting(true);
    const res = await reassignGallery({
      id: gallery.id,
      newOwnerId: selectedUser.id,
    });
    setSubmitting(false);

    if ("error" in res) {
      setError(res.error ?? t("dashboard.galleries.somethingWentWrong"));
      return;
    }

    onReassigned(gallery.id, selectedUser.id, selectedUser.name);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t("dashboard.galleries.reassignDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("dashboard.galleries.reassignDialog.description", {
              name: gallery.name,
            })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("dashboard.galleries.reassignDialog.newOwner")}</Label>
            <BackendUserCombobox
              value={selectedUser?.id ?? ""}
              selectedUser={selectedUser}
              currentUserId={gallery.createdBy}
              onValueChange={setSelectedUser}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              {t("dashboard.common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={submitting || !selectedUser}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("dashboard.common.actions.reassign")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
