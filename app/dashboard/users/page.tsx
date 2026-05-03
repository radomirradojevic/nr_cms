import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasRole, getRoles, type Role } from "@/lib/roles";

const roleBadgeVariant: Record<
  Role,
  "default" | "secondary" | "outline" | "destructive"
> = {
  viewer: "outline",
  author: "secondary",
  publisher: "default",
  admin: "destructive",
};

export default async function UsersPage() {
  const caller = await currentUser();

  if (!hasRole(caller?.publicMetadata?.roles, "admin")) {
    redirect("/dashboard");
  }

  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({ limit: 100 });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">User Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage users and their roles. Admin access only.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const displayName =
              (user.username ??
                [user.firstName, user.lastName].filter(Boolean).join(" ")) ||
              "—";
            const email = user.primaryEmailAddress?.emailAddress ?? "—";
            const roles = getRoles(user.publicMetadata);

            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{displayName}</TableCell>
                <TableCell>{email}</TableCell>
                <TableCell>
                  <Badge variant={user.banned ? "destructive" : "secondary"}>
                    {user.banned ? "Banned" : "Active"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {roles.map((role) => (
                      <Badge key={role} variant={roleBadgeVariant[role]}>
                        {role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/users/${user.id}`}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
