"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, UserRoundCog } from "lucide-react";

import { BackendUserCombobox } from "@/app/dashboard/_components/backend-user-combobox";
import type { BackendUserOption } from "@/lib/backend-user-types";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
import { useSourceTranslations } from "@/components/source-translations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { reassignContent } from "./actions";
import type { ContentRow } from "./content-table";

type Props = {
  row: ContentRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMutated: () => void;
};

export function ContentReassignDialog({
  row,
  open,
  onOpenChange,
  onMutated,
}: Props) {
  const t = useTranslations();
  const st = useSourceTranslations();
  const [selectedUser, setSelectedUser] = useState<BackendUserOption | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      setSelectedUser({ id: row.authorId, name: row.authorName });
      setError(null);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [open, row.authorId, row.authorName]);

  function handleConfirm() {
    if (!selectedUser || selectedUser.id === row.authorId) {
      onOpenChange(false);
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await reassignContent({
        id: row.id,
        newAuthorId: selectedUser.id,
      });
      if ("error" in res && res.error) {
        setError(res.error);
      } else {
        onMutated();
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRoundCog className="h-5 w-5" />
            {t("dashboard.content.dialogs.reassignAuthorTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("dashboard.content.dialogs.reassignAuthorDescription", {
              title: row.title,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-2">
          <BackendUserCombobox
            value={selectedUser?.id ?? ""}
            selectedUser={selectedUser}
            currentUserId={row.authorId}
            onValueChange={setSelectedUser}
          />

          {error && <p className="text-sm text-destructive">{st(error)}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {t("dashboard.common.actions.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={pending || !selectedUser}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("dashboard.common.actions.reassign")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
