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
import { lockUser, unlockUser } from "@/app/dashboard/users/[userId]/actions";

type Props = {
  userId: string;
  isLocked: boolean;
};

export function LockUserButton({ userId, isLocked }: Props) {
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
            {isLocked ? "Unlock User" : "Lock User"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isLocked ? "Unlock this user?" : "Lock this user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isLocked
                ? "This will remove the sign-in lock and restore the user's access immediately."
                : "This will prevent the user from signing in until the lock expires (1 hour by default, configurable in Clerk Attack Protection settings). You can unlock them at any time."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
              {isLocked ? "Unlock" : "Lock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
