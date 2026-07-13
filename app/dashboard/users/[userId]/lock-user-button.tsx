"use client";

import { useState, useTransition } from "react";
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
import { useTranslations } from "@/components/i18n-provider";
import { lockUser, unlockUser } from "@/app/dashboard/users/[userId]/actions";

type Props = {
  userId: string;
  isLocked: boolean;
};

export function LockUserButton({ userId, isLocked }: Props) {
  const t = useTranslations();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = isLocked
        ? await unlockUser(userId)
        : await lockUser(userId);
      if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant={isLocked ? "outline" : "secondary"}
            size="sm"
            disabled={isPending}
          >
            {isLocked
              ? t("dashboard.users.unlockUser")
              : t("dashboard.users.lockUser")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isLocked
                ? t("dashboard.users.unlockTitle")
                : t("dashboard.users.lockTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isLocked
                ? t("dashboard.users.unlockDescription")
                : t("dashboard.users.lockDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("dashboard.common.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
              {isLocked
                ? t("dashboard.users.unlock")
                : t("dashboard.users.lock")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
