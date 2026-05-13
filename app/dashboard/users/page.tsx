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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasRole, getRoles, type Role } from "@/lib/roles";
import { UsersFilters } from "./_components/users-filters";
import { LockUserButton } from "./[userId]/lock-user-button";

const roleBadgeVariant: Record<
  Role,
  "default" | "secondary" | "outline" | "destructive"
> = {
  viewer: "outline",
  author: "secondary",
  publisher: "default",
  admin: "destructive",
};

const PER_PAGE_OPTIONS = [10, 20, 30] as const;

function buildHref(
  current: URLSearchParams,
  updates: Record<string, string>,
): string {
  const params = new URLSearchParams(current.toString());
  for (const [k, v] of Object.entries(updates)) {
    if (v) params.set(k, v);
    else params.delete(k);
  }
  const qs = params.toString();
  return `/dashboard/users${qs ? `?${qs}` : ""}`;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const caller = await currentUser();

  if (!hasRole(caller?.publicMetadata?.roles, "admin")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const search = params.search?.trim() ?? "";
  const statusFilter = params.status ?? "all";
  const roleFilter = params.role ?? "all";
  const perPage = PER_PAGE_OPTIONS.includes(
    Number(params.perPage) as (typeof PER_PAGE_OPTIONS)[number],
  )
    ? Number(params.perPage)
    : 10;
  const page = Math.max(1, Number(params.page) || 1);

  // Fetch users from Clerk — use query param for username/email text search
  const client = await clerkClient();
  const { data: fetched } = await client.users.getUserList({
    limit: 500,
    ...(search ? { query: search } : {}),
  });

  // Filter by status
  const byStatus =
    statusFilter === "locked"
      ? fetched.filter((u) => u.locked)
      : statusFilter === "active"
        ? fetched.filter((u) => !u.locked)
        : fetched;

  // Filter by role (publicMetadata — done in-memory)
  const filtered =
    roleFilter !== "all"
      ? byStatus.filter((u) => {
          const roles = getRoles(u.publicMetadata);
          return roles.includes(roleFilter as Role);
        })
      : byStatus;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  // Build URLSearchParams for pagination links
  const baseParams = new URLSearchParams();
  if (search) baseParams.set("search", search);
  if (statusFilter !== "all") baseParams.set("status", statusFilter);
  if (roleFilter !== "all") baseParams.set("role", roleFilter);
  if (perPage !== 10) baseParams.set("perPage", String(perPage));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">User Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage users and their roles. Admin access only.
        </p>
      </div>

      <UsersFilters />

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
          {paginated.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground py-8"
              >
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            paginated.map((user) => {
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
                    <Badge variant={user.locked ? "destructive" : "secondary"}>
                      {user.locked ? "Locked" : "Active"}
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
                    <div className="flex items-center justify-end gap-2">
                      <LockUserButton
                        userId={user.id}
                        isLocked={user.locked ?? false}
                      />
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/users/${user.id}`}>View</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? "No users"
            : `Showing ${(currentPage - 1) * perPage + 1}–${Math.min(currentPage * perPage, total)} of ${total} user${total === 1 ? "" : "s"}`}
        </p>

        {totalPages > 1 && (
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={
                    currentPage > 1
                      ? buildHref(baseParams, {
                          page: String(currentPage - 1),
                        })
                      : undefined
                  }
                  aria-disabled={currentPage <= 1}
                  className={
                    currentPage <= 1 ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink
                    href={buildHref(baseParams, { page: String(p) })}
                    isActive={p === currentPage}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  href={
                    currentPage < totalPages
                      ? buildHref(baseParams, {
                          page: String(currentPage + 1),
                        })
                      : undefined
                  }
                  aria-disabled={currentPage >= totalPages}
                  className={
                    currentPage >= totalPages
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
