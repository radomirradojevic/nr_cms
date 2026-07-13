import { clerkClient } from "@clerk/nextjs/server";
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
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoleLabelKey, hasRole, getRoles, type Role } from "@/lib/roles";
import { getTranslations } from "@/lib/i18n/server";
import { UsersFilters } from "./_components/users-filters";
import { UsersTablePagination } from "./_components/users-table-pagination";
import { LockUserButton } from "./[userId]/lock-user-button";
import { ForceSignOutButton } from "./[userId]/force-signout-button";

const roleBadgeVariant: Record<
  Role,
  "default" | "secondary" | "outline" | "destructive"
> = {
  viewer: "outline",
  author: "secondary",
  publisher: "default",
  admin: "destructive",
};

const PER_PAGE_OPTIONS = [10, 20, 30, 50, 100] as const;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const t = await getTranslations("backend");
  const caller = await getOptionalCurrentUser();

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
  const presenceFilter = params.presence ?? "all";
  const page = Math.max(1, Number(params.page) || 1);

  // Fetch users from Clerk — use query param for username/email text search
  const client = await clerkClient();
  const { data: fetched } = await client.users.getUserList({
    limit: 500,
    ...(search ? { query: search } : {}),
  });

  // Determine real online presence by checking Clerk for an active session per user.
  // `User.lastActiveAt` from Clerk only has day-level precision, so it cannot be
  // used to detect "currently logged in". The Backend Sessions API requires a
  // userId/clientId scope, so we query per-user in parallel.
  const onlineFlags = await Promise.all(
    fetched.map(async (u) => {
      try {
        const { data: sessions } = await client.sessions.getSessionList({
          userId: u.id,
          status: "active",
          limit: 1,
        });
        return [u.id, sessions.length > 0] as const;
      } catch {
        return [u.id, false] as const;
      }
    }),
  );
  const onlineUserIds = new Set(
    onlineFlags.filter(([, online]) => online).map(([id]) => id),
  );

  // Filter by status
  const byStatus =
    statusFilter === "locked"
      ? fetched.filter((u) => u.locked)
      : statusFilter === "active"
        ? fetched.filter((u) => !u.locked)
        : fetched;

  // Filter by role (publicMetadata — done in-memory)
  const byRole =
    roleFilter !== "all"
      ? byStatus.filter((u) => {
          const roles = getRoles(u.publicMetadata);
          return roles.includes(roleFilter as Role);
        })
      : byStatus;

  // Filter by presence (online / offline)
  const filtered =
    presenceFilter === "online"
      ? byRole.filter((u) => onlineUserIds.has(u.id))
      : presenceFilter === "offline"
        ? byRole.filter((u) => !onlineUserIds.has(u.id))
        : byRole;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("dashboard.users.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("dashboard.users.description")}
        </p>
      </div>

      <UsersFilters />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("dashboard.common.table.username")}</TableHead>
            <TableHead>{t("dashboard.common.table.email")}</TableHead>
            <TableHead>{t("dashboard.common.table.status")}</TableHead>
            <TableHead>{t("dashboard.common.table.roles")}</TableHead>
            <TableHead>{t("dashboard.common.table.presence")}</TableHead>
            <TableHead className="text-right">
              {t("dashboard.common.table.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-muted-foreground py-8"
              >
                {t("dashboard.users.noUsers")}
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
              const isOnline = onlineUserIds.has(user.id);

              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{displayName}</TableCell>
                  <TableCell>{email}</TableCell>
                  <TableCell>
                    <Badge variant={user.locked ? "destructive" : "secondary"}>
                      {user.locked
                        ? t("dashboard.users.status.locked")
                        : t("dashboard.users.status.active")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {roles.map((role) => (
                        <Badge key={role} variant={roleBadgeVariant[role]}>
                          {t(getRoleLabelKey(role))}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          isOnline ? "bg-green-500" : "bg-muted-foreground/40"
                        }`}
                      />
                      <span className="text-sm">
                        {isOnline
                          ? t("dashboard.users.presence.online")
                          : t("dashboard.users.presence.offline")}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <ForceSignOutButton
                        userId={user.id}
                        disabled={user.id === caller?.id || !isOnline}
                      />
                      <LockUserButton
                        userId={user.id}
                        isLocked={user.locked ?? false}
                      />
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/users/${user.id}`}>
                          {t("dashboard.common.actions.view")}
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <UsersTablePagination
        currentPage={currentPage}
        perPage={perPage}
        total={total}
        totalPages={totalPages}
      />
    </div>
  );
}
