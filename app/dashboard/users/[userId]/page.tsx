import { clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoleLabelKey, hasRole, getRoles, type Role } from "@/lib/roles";
import { getTranslations } from "@/lib/i18n/server";
import { EditUserDialog } from "@/app/dashboard/users/[userId]/edit-user-dialog";
import { LockUserButton } from "@/app/dashboard/users/[userId]/lock-user-button";
import { ForceSignOutButton } from "@/app/dashboard/users/[userId]/force-signout-button";
import { DeleteUserButton } from "@/app/dashboard/users/[userId]/delete-user-button";
import { getGlobalSettings } from "@/data/global-settings";
import { getDateFormatter } from "@/lib/regional-settings";

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
  const t = await getTranslations("backend");
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
  const settings = await getGlobalSettings();
  const createdAt = getDateFormatter(settings.regional, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(user.createdAt));

  return (
    <div className="max-w-xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link href="/dashboard/users">
              {t("dashboard.users.backToUsers")}
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">
            {t("dashboard.users.detailsTitle")}
          </h1>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
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
        <Row label={t("dashboard.users.labels.username")} value={displayName} />
        <Row label={t("dashboard.users.labels.email")} value={email} />
        <Row
          label={t("dashboard.users.labels.memberSince")}
          value={createdAt}
        />
        <Row
          label={t("dashboard.users.labels.status")}
          value={
            <Badge variant={user.locked ? "destructive" : "secondary"}>
              {user.locked
                ? t("dashboard.users.status.locked")
                : t("dashboard.users.status.active")}
            </Badge>
          }
        />
        <Row
          label={t("dashboard.users.labels.presence")}
          value={
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
          }
        />
        <Row
          label={t("dashboard.users.labels.roles")}
          value={
            <div className="flex flex-wrap gap-1">
              {roles.map((role) => (
                <Badge key={role} variant={roleBadgeVariant[role]}>
                  {t(getRoleLabelKey(role))}
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
    <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center sm:gap-4">
      <span className="text-sm text-muted-foreground sm:shrink-0">{label}</span>
      <div className="min-w-0 break-words text-sm">{value}</div>
    </div>
  );
}
