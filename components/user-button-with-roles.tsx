"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { getRoles, type Role } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { ShieldCheckIcon } from "lucide-react";

const roleBadgeVariant: Record<
  Role,
  "default" | "secondary" | "outline" | "destructive"
> = {
  viewer: "outline",
  author: "secondary",
  publisher: "default",
  admin: "destructive",
};

const roleDescriptions: Record<Role, string> = {
  viewer: "Can view frontend content only.",
  author: "Can create and manage own content.",
  publisher: "Can manage and publish content.",
  admin: "Full backend access including user management.",
};

function RolesProfilePage() {
  const { user } = useUser();
  const roles = getRoles(user?.publicMetadata);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">My Roles</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Roles assigned to your account by an administrator.
        </p>
      </div>
      <div className="space-y-2">
        {roles.map((role) => (
          <div
            key={role}
            className="flex items-start gap-3 rounded-lg border p-3"
          >
            <Badge
              variant={roleBadgeVariant[role]}
              className="mt-0.5 capitalize"
            >
              {role}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {roleDescriptions[role]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UserButtonWithRoles() {
  return (
    <UserButton>
      <UserButton.UserProfilePage
        label="My Roles"
        url="roles"
        labelIcon={<ShieldCheckIcon className="size-4" />}
      >
        <RolesProfilePage />
      </UserButton.UserProfilePage>
    </UserButton>
  );
}
