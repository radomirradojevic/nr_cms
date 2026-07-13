"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useSourceTranslations } from "@/components/source-translations";

import { restoreContentRevision } from "./actions";

type RevisionPreviewRestoreButtonProps = {
  contentId: string;
  revisionId: number;
  revisionNumber: number;
  expectedVersion: number;
};

export function RevisionPreviewRestoreButton({
  contentId,
  revisionId,
  revisionNumber,
  expectedVersion,
}: RevisionPreviewRestoreButtonProps) {
  const st = useSourceTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function restoreRevision() {
    startTransition(async () => {
      const result = await restoreContentRevision({
        contentId,
        revisionId,
        expectedVersion,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        st("Revision #{revisionNumber} restored.", { revisionNumber }),
      );
      for (const warning of result.warnings ?? []) {
        toast.warning(st(warning));
      }
      router.replace(`/dashboard/content/${contentId}/edit?inspector=history`);
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" size="sm" disabled={isPending}>
          {isPending ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <RotateCcw aria-hidden className="size-4" />
          )}
          {st("Restore")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {st("Restore revision #{revisionNumber}?", { revisionNumber })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {st(
              "This replaces the saved content with this revision snapshot and then returns you to the editor.",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {st("Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              restoreRevision();
            }}
          >
            {st("Restore")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
