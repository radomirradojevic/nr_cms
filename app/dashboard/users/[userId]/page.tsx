import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasRole, getRoles, type Role } from "@/lib/roles";
import { EditUserDialog } from "@/app/dashboard/users/[userId]/edit-user-dialog";

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
  const caller = await currentUser();

  if (!hasRole(caller?.publicMetadata?.roles, "admin")) {
    redirect("/dashboard");
  }

  const client = await clerkClient();
  const user = await client.users.getUser(targetUserId);

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
        <EditUserDialog userId={user.id} currentRoles={roles} />
      </div>

      <div className="border rounded-lg divide-y">
        <Row label="Username" value={displayName} />
        <Row label="Email" value={email} />
        <Row label="Member since" value={createdAt} />
        <Row
          label="Status"
          value={
            <Badge variant={user.banned ? "destructive" : "secondary"}>
              {user.banned ? "Banned" : "Active"}
            </Badge>
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
