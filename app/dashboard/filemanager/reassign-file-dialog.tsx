"use client";

import { useEffect, useState } from "react";
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
import type { FileRow } from "@/data/files";
import { reassignFile } from "./actions";

type Props = {
  file: FileRow;
  ownerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReassigned: (
    file: FileRow,
    newOwnerId: string,
    newOwnerName: string,
  ) => void;
};

export function ReassignFileDialog({
  file,
  ownerName,
  open,
  onOpenChange,
  onReassigned,
}: Props) {
  const t = useTranslations();
  const [selectedUser, setSelectedUser] = useState<BackendUserOption | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      setSelectedUser({ id: file.uploadedBy, name: ownerName });
      setError(null);
      setSaving(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [open, file.uploadedBy, ownerName]);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setError(null);
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) {
      setError(t("dashboard.files.reassign.selectUser"));
      return;
    }

    setError(null);
    setSaving(true);
    const result = await reassignFile({
      fileId: file.id,
      newOwnerId: selectedUser.id,
    });
    setSaving(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    onReassigned(result.file, selectedUser.id, selectedUser.name);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("dashboard.files.reassign.title")}</DialogTitle>
            <DialogDescription>
              {t("dashboard.files.reassign.description", {
                name: file.filename,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-owner">
                {t("dashboard.files.reassign.newOwner")}
              </Label>
              <BackendUserCombobox
                value={selectedUser?.id ?? ""}
                selectedUser={selectedUser}
                currentUserId={file.uploadedBy}
                onValueChange={setSelectedUser}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              {t("dashboard.common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={saving || !selectedUser}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("dashboard.common.actions.reassign")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
