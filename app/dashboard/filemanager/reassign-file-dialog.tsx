"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { listCmsUsers, reassignFile, type CmsUser } from "./actions";
import type { FileRow } from "@/data/files";

type Props = {
  file: FileRow;
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
  open,
  onOpenChange,
  onReassigned,
}: Props) {
  const [users, setUsers] = useState<CmsUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      setSelectedUserId(file.uploadedBy);
      setError(null);
      setLoadingUsers(true);
      listCmsUsers().then((res) => {
        setLoadingUsers(false);
        if ("error" in res) {
          setError(res.error);
          return;
        }
        setUsers(res.users);
      });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [open, file.uploadedBy]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) return;
    setError(null);
    setSaving(true);
    const result = await reassignFile({
      fileId: file.id,
      newOwnerId: selectedUserId,
    });
    setSaving(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    const newOwner = users.find((u) => u.id === selectedUserId);
    onReassigned(result.file, selectedUserId, newOwner?.name ?? selectedUserId);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Reassign file owner</DialogTitle>
            <DialogDescription>
              Transfer ownership of &quot;{file.filename}&quot; to another CMS
              user.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            {loadingUsers ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading users…
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="new-owner">New owner</Label>
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                >
                  <SelectTrigger id="new-owner">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || loadingUsers || !selectedUserId}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reassign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
