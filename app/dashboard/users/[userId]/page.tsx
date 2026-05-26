import { clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { hasRole, getRoles, type Role } from "@/lib/roles";
import { EditUserDialog } from "@/app/dashboard/users/[userId]/edit-user-dialog";
import { LockUserButton } from "@/app/dashboard/users/[userId]/lock-user-button";
import { ForceSignOutButton } from "@/app/dashboard/users/[userId]/force-signout-button";
import { DeleteUserButton } from "@/app/dashboard/users/[userId]/delete-user-button";

const roleBadgeVariant: Record<
  Role,
  "default" | "secondary" | "outline" | "destructive"
> = {
  viewer: "outline",
  author: "secondary",
  publisher: "default",
  admin: "destructive",
};

type Props = {
  params: Promise<{ userId: string }>;
};

export default async function UserDetailPage({ params }: Props) {
  const { userId: targetUserId } = await params;
  const caller = await getOptionalCurrentUser();

  if (!hasRole(caller?.publicMetadata?.roles, "admin")) {
    redirect("/dashboard");
  }

  const client = await clerkClient();
  const user = await client.users.getUser(targetUserId);

  // Determine real online presence by checking Clerk for an active session.
  // `User.lastActiveAt` only has day-level precision, so it cannot be used to
  // detect "currently logged in".
  let isOnline = false;
  try {
    const { data: sessions } = await client.sessions.getSessionList({
      userId: user.id,
      status: "active",
      limit: 1,
    });
    isOnline = sessions.length > 0;
  } catch {
    isOnline = false;
  }

  const displayName =
    (user.username ??
      [user.firstName, user.lastName].filter(Boolean).join(" ")) ||
    "—";
  const email = user.primaryEmailAddress?.emailAddress ?? "—";
  const roles = getRoles(user.publicMetadata);
  const createdAt = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link href="/dashboard/users">← Back to Users</Link>
          </Button>
          <h1 className="text-2xl font-semibold">User Details</h1>
        </div>
        <div className="flex items-center gap-2">
          <ForceSignOutButton
            userId={user.id}
            disabled={user.id === caller?.id || !isOnline}
          />
          <LockUserButton userId={user.id} isLocked={user.locked ?? false} />
          <EditUserDialog userId={user.id} currentRoles={roles} />
          <DeleteUserButton userId={user.id} />
        </div>
      </div>

      <div className="border rounded-lg divide-y">
        <Row label="Username" value={displayName} />
        <Row label="Email" value={email} />
        <Row label="Member since" value={createdAt} />
        <Row
          label="Status"
          value={
            <Badge variant={user.locked ? "destructive" : "secondary"}>
              {user.locked ? "Locked" : "Active"}
            </Badge>
          }
        />
        <Row
          label="Presence"
          value={
            <span className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  isOnline ? "bg-green-500" : "bg-muted-foreground/40"
                }`}
              />
              <span className="text-sm">{isOnline ? "Online" : "Offline"}</span>
            </span>
          }
        />
        <Row
          label="Roles"
          value={
            <div className="flex flex-wrap gap-1">
              {roles.map((role) => (
                <Badge key={role} variant={roleBadgeVariant[role]}>
                  {role}
                </Badge>
              ))}
            </div>
          }
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center px-4 py-3 gap-4">
      <span className="w-36 text-sm text-muted-foreground shrink-0">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
