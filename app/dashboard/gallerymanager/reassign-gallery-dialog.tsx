"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      setSearch("");
      setSelectedId("");
      setError(null);
      setDropdownOpen(false);
      setLoadingUsers(true);
      fetchCmsUsers().then((res) => {
        setLoadingUsers(false);
        if ("error" in res) {
          setError(res.error);
        } else {
          setUsers(res.users);
        }
      });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [open]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (dropdownOpen) {
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [dropdownOpen]);

  const filtered = search.trim()
    ? users.filter((u) =>
        u.name.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : users;

  const selectedUser = users.find((u) => u.id === selectedId);

  function handleSelect(userId: string) {
    setSelectedId(userId);
    setDropdownOpen(false);
  }

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
      setError(res.error ?? "Something went wrong.");
      return;
    }
    onReassigned(gallery.id, selectedId, selectedUser?.name ?? "Unknown");
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
              <Popover
                open={dropdownOpen}
                onOpenChange={(nextOpen) => {
                  setDropdownOpen(nextOpen);
                  if (!nextOpen) setSearch("");
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={dropdownOpen}
                    className="w-full justify-between font-normal"
                  >
                    <span
                      className={cn(!selectedUser && "text-muted-foreground")}
                    >
                      {selectedUser ? selectedUser.name : "Select a user…"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] gap-0 overflow-hidden p-0"
                  align="start"
                >
                  {/* Search row */}
                  <div className="flex items-center gap-2 border-b px-3 py-2">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                      ref={searchRef}
                      placeholder="Search users…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>

                  {/* User list */}
                  <div className="max-h-48 overflow-y-auto py-1">
                    {filtered.length === 0 ? (
                      <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                        No users found.
                      </p>
                    ) : (
                      filtered.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleSelect(u.id)}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted",
                            selectedId === u.id && "bg-muted font-medium",
                          )}
                        >
                          <Check
                            className={cn(
                              "h-4 w-4 shrink-0",
                              selectedId === u.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {u.name}
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
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
