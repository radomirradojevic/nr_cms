"use client";

import { useState } from "react";
import { Loader2, UserCog } from "lucide-react";

import { BackendUserCombobox } from "@/app/dashboard/_components/backend-user-combobox";
import type { BackendUserOption } from "@/lib/backend-user-types";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
import { useSourceTranslations } from "@/components/source-translations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { reassignForm } from "./actions";
import { translateFormBuilderError } from "./form-error-message";

type Props = {
  formId: string;
  formName: string;
  currentOwnerId: string | null;
  currentOwnerName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReassigned: (
    formId: string,
    newOwnerId: string,
    newOwnerName: string,
  ) => void;
};

export function ReassignFormDialog({
  formId,
  formName,
  currentOwnerId,
  currentOwnerName,
  open,
  onOpenChange,
  onReassigned,
}: Props) {
  const t = useTranslations();
  const st = useSourceTranslations();
  const [selectedUser, setSelectedUser] = useState<BackendUserOption | null>(
    currentOwnerId
      ? { id: currentOwnerId, name: currentOwnerName ?? currentOwnerId }
      : null,
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setServerError(null);
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) {
      setServerError(t("dashboard.validation.ownerRequired"));
      return;
    }

    setServerError(null);
    setSaving(true);
    const result = await reassignForm({
      id: formId,
      ownerId: selectedUser.id,
    });
    setSaving(false);

    if ("error" in result && result.error) {
      setServerError(result.error);
      return;
    }

    onReassigned(formId, selectedUser.id, selectedUser.name);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dashboard.forms.reassignTitle")}</DialogTitle>
          <DialogDescription>
            {t("dashboard.forms.reassignDescription", { name: formName })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("dashboard.forms.newOwner")}</Label>
            <BackendUserCombobox
              value={selectedUser?.id ?? ""}
              selectedUser={selectedUser}
              currentUserId={currentOwnerId}
              onValueChange={setSelectedUser}
            />
          </div>

          {serverError && (
            <p className="text-sm text-destructive">
              {translateFormBuilderError(st, serverError)}
            </p>
          )}

          <div className="flex justify-end gap-2">
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
              <UserCog className="mr-2 h-4 w-4" />
              {t("dashboard.common.actions.reassign")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
