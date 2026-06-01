"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2, UserCog } from "lucide-react";

import { BackendUserCombobox } from "@/app/dashboard/_components/backend-user-combobox";
import { useAdminSectionLock } from "@/components/admin-section-lock-provider";
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
import type { BackendUserOption } from "@/lib/backend-user-types";
import { deleteMenu, reassignMenuOwner, renameMenu } from "../top-menu/actions";

type MenuActionTarget = {
  id: string;
  name: string;
  createdBy: string | null;
  creatorName: string | null;
};

type MenuRowActionsProps = {
  menu: MenuActionTarget;
  isHeaderMenu: boolean;
  onChanged?: () => void;
};

export function MenuRowActions({
  menu,
  isHeaderMenu,
  onChanged,
}: MenuRowActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <RenameMenuDialog menu={menu} onChanged={onChanged} />
      <ReassignMenuDialog menu={menu} onChanged={onChanged} />
      <DeleteMenuDialog
        menu={menu}
        isHeaderMenu={isHeaderMenu}
        onChanged={onChanged}
      />
    </div>
  );
}

function RenameMenuDialog({
  menu,
  onChanged,
}: {
  menu: MenuActionTarget;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const lock = useAdminSectionLock();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(menu.name);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setName(menu.name);
    setServerError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    startTransition(async () => {
      const result = await renameMenu({ id: menu.id, name }, lock.clientId);
      if ("error" in result && result.error) {
        setServerError(result.error);
        return;
      }
      setOpen(false);
      if (onChanged) onChanged();
      else router.refresh();
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!lock.isEditor}
        >
          <Pencil className="h-4 w-4" />
          Rename
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename Menu</DialogTitle>
          <DialogDescription>
            Menu names must be unique across the system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`rename-menu-${menu.id}`}>Menu Name</Label>
            <Input
              id={`rename-menu-${menu.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              autoFocus
            />
          </div>
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !lock.isEditor}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReassignMenuDialog({
  menu,
  onChanged,
}: {
  menu: MenuActionTarget;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const lock = useAdminSectionLock();
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<BackendUserOption | null>(
    getInitialSelectedUser(menu),
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setSelectedUser(getInitialSelectedUser(menu));
    setServerError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedUser) {
      setServerError("Owner is required.");
      return;
    }

    setServerError(null);
    startTransition(async () => {
      const result = await reassignMenuOwner(
        { id: menu.id, ownerId: selectedUser.id },
        lock.clientId,
      );
      if ("error" in result && result.error) {
        setServerError(result.error);
        return;
      }
      setOpen(false);
      if (onChanged) onChanged();
      else router.refresh();
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!lock.isEditor}
        >
          <UserCog className="h-4 w-4" />
          Reassign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign Menu</DialogTitle>
          <DialogDescription>
            Change the owner of &quot;{menu.name}&quot;.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`reassign-menu-owner-${menu.id}`}>New Owner</Label>
            <BackendUserCombobox
              id={`reassign-menu-owner-${menu.id}`}
              value={selectedUser?.id ?? ""}
              selectedUser={selectedUser}
              currentUserId={menu.createdBy}
              onValueChange={setSelectedUser}
            />
          </div>
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !selectedUser || !lock.isEditor}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserCog className="h-4 w-4" />
              )}
              Reassign
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getInitialSelectedUser(
  menu: MenuActionTarget,
): BackendUserOption | null {
  if (!menu.createdBy) return null;
  return { id: menu.createdBy, name: menu.creatorName ?? menu.createdBy };
}

function DeleteMenuDialog({
  menu,
  isHeaderMenu,
  onChanged,
}: {
  menu: MenuActionTarget;
  isHeaderMenu: boolean;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const lock = useAdminSectionLock();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const disabled = !lock.isEditor || isHeaderMenu;

  function handleDelete() {
    setServerError(null);

    startTransition(async () => {
      const result = await deleteMenu({ id: menu.id }, lock.clientId);
      if ("error" in result && result.error) {
        setServerError(result.error);
        return;
      }
      setOpen(false);
      if (onChanged) onChanged();
      else router.refresh();
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setServerError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          title={
            isHeaderMenu
              ? 'Select another menu or "Without menu" in Header Settings before deleting.'
              : undefined
          }
        >
          <Trash2 className="h-4 w-4 text-destructive" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete menu?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete{" "}
            <span className="font-medium">{menu.name}</span> and all of its menu
            items. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {isHeaderMenu && (
          <p className="text-sm text-muted-foreground">
            This menu is assigned to the Header. Select another menu or
            &quot;Without menu&quot; in Header Settings before deleting it.
          </p>
        )}
        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isPending || isHeaderMenu}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
