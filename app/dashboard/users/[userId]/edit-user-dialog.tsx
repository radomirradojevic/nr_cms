"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ROLES, type Role } from "@/lib/roles";
import { updateUserRoles } from "@/app/dashboard/users/[userId]/actions";

type Props = {
  userId: string;
  currentRoles: Role[];
};

const ROLE_LABELS: Record<Role, string> = {
  viewer: "Viewer — frontend read-only access (always assigned)",
  author: "Author — create & manage own content",
  publisher: "Publisher — manage & publish content",
  admin: "Admin — full backend access",
};

export function EditUserDialog({ userId, currentRoles }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Role[]>(currentRoles);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(role: Role) {
    if (role === "viewer") return; // viewer is always assigned
    setSelected((prev) => {
      // Only one role at a time; viewer is always implicitly assigned.
      // Clicking the currently-selected role clears it back to viewer-only.
      if (prev.includes(role)) return ["viewer"];
      return ["viewer", role];
    });
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateUserRoles({ userId, roles: selected });
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit Roles
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User Roles</DialogTitle>
          <DialogDescription>
            Select the roles to assign to this user.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {ROLES.map((role) => (
            <div key={role} className="flex items-start gap-3">
              <Checkbox
                id={`role-${role}`}
                checked={selected.includes(role)}
                onCheckedChange={() => toggle(role)}
                disabled={role === "viewer"}
              />
              <Label
                htmlFor={`role-${role}`}
                className="leading-snug cursor-pointer"
              >
                <span className="font-medium capitalize">{role}</span>
                <br />
                <span className="text-muted-foreground text-xs">
                  {ROLE_LABELS[role]}
                </span>
              </Label>
            </div>
          ))}
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
