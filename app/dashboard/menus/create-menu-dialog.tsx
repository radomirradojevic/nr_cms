"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import { useAdminSectionLock } from "@/components/admin-section-lock-provider";
import { useTranslations } from "@/components/i18n-provider";
import { useSourceTranslations } from "@/components/source-translations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMenu } from "../top-menu/actions";

export function CreateMenuDialog() {
  const t = useTranslations();
  const st = useSourceTranslations();
  const router = useRouter();
  const lock = useAdminSectionLock();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setName("");
    setServerError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    startTransition(async () => {
      const result = await createMenu({ name }, lock.clientId);
      if ("error" in result && result.error) {
        setServerError(result.error);
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" disabled={!lock.isEditor}>
          <Plus className="h-4 w-4" />
          {t("dashboard.menus.create")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dashboard.menus.createTitle")}</DialogTitle>
          <DialogDescription>
            {t("dashboard.menus.createDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="menuName">{t("dashboard.menus.menuName")}</Label>
            <Input
              id="menuName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              autoFocus
            />
          </div>
          {serverError && (
            <p className="text-sm text-destructive">{st(serverError)}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t("dashboard.common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending || !lock.isEditor}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("dashboard.common.actions.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
