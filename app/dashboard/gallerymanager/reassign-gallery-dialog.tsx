"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GalleryListItem } from "@/data/galleries";
import { fetchCmsUsers, reassignGallery, type CmsUser } from "./actions";

type Props = {
  gallery: GalleryListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReassigned: (id: string, newOwnerId: string, newOwnerName: string) => void;
};

export function ReassignGalleryDialog({
  gallery,
  open,
  onOpenChange,
  onReassigned,
}: Props) {
  const [users, setUsers] = useState<CmsUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFilter("");
    setSelectedId("");
    setError(null);
    setLoadingUsers(true);
    fetchCmsUsers().then((res) => {
      setLoadingUsers(false);
      if ("error" in res) {
        setError(res.error);
      } else {
        setUsers(res.users);
      }
    });
  }, [open]);

  const filtered = filter.trim()
    ? users.filter((u) =>
        u.name.toLowerCase().includes(filter.trim().toLowerCase()),
      )
    : users;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) {
      setError("Please select a user.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await reassignGallery({
      id: gallery.id,
      newOwnerId: selectedId,
    });
    setSubmitting(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    const newOwner = users.find((u) => u.id === selectedId);
    toast.success("Gallery owner updated.");
    onReassigned(gallery.id, selectedId, newOwner?.name ?? "Unknown");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reassign Owner</DialogTitle>
          <DialogDescription>
            Assign &ldquo;{gallery.name}&rdquo; to a different user.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>New Owner</Label>

            {loadingUsers ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading users…
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search users…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No users found.
                    </p>
                  ) : (
                    filtered.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedId(u.id)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-muted ${
                          selectedId === u.id ? "bg-muted font-medium" : ""
                        }`}
                      >
                        {u.name}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !selectedId || loadingUsers}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reassign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
