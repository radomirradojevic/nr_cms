"use client";

import { useState, useTransition, useEffect } from "react";
import { Loader2, UserRoundCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchClerkUsersForReassign, reassignContent } from "./actions";
import type { ContentRow } from "./content-table";

type ClerkUser = { id: string; name: string };

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
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      setSelectedUserId(row.authorId);
      setError(null);
      setLoadingUsers(true);
      fetchClerkUsersForReassign()
        .then((res) => {
          if ("error" in res) {
            setError(res.error);
          } else {
            setUsers(res.users);
          }
        })
        .finally(() => setLoadingUsers(false));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [open, row.authorId]);

  function handleConfirm() {
    if (!selectedUserId || selectedUserId === row.authorId) {
      onOpenChange(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await reassignContent({
        id: row.id,
        newAuthorId: selectedUserId,
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
            Reassign author
          </DialogTitle>
          <DialogDescription>
            Select a new author for{" "}
            <span className="font-medium">{row.title}</span>. Only admins can
            perform this action.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {loadingUsers ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading users…
            </div>
          ) : (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                    {u.id === row.authorId ? " (current)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={pending || loadingUsers || !selectedUserId}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reassign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
