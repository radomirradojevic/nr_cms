import { clerkClient } from "@clerk/nextjs/server";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  Mail,
  ShieldCheck,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
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
  const statusLabel = user.locked
    ? t("dashboard.users.status.locked")
    : t("dashboard.users.status.active");
  const presenceLabel = isOnline
    ? t("dashboard.users.presence.online")
    : t("dashboard.users.presence.offline");
  const headerSummaryParts = [
    displayName !== "—" ? displayName : null,
    email !== "—" ? email : null,
  ].filter(Boolean);
  const headerSummary = headerSummaryParts.length
    ? headerSummaryParts.join(" - ")
    : user.id;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Button variant="outline" size="sm" asChild className="w-fit">
          <Link href="/dashboard/users">
            <ArrowLeft aria-hidden className="size-4" />
            {t("dashboard.users.backToUsers")}
          </Link>
        </Button>

        <div className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {t("dashboard.users.detailsTitle")}
              </h1>
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {headerSummary}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={user.locked ? "destructive" : "secondary"}>
                {statusLabel}
              </Badge>
              <span className="inline-flex h-5 items-center gap-1.5 rounded-full border border-border px-2 text-xs font-medium">
                <span
                  className={`size-2 shrink-0 rounded-full ${
                    isOnline ? "bg-green-500" : "bg-muted-foreground/40"
                  }`}
                />
                {presenceLabel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 min-[460px]:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end [&_[data-slot=button]]:w-full lg:[&_[data-slot=button]]:w-auto">
            <EditUserDialog userId={user.id} currentRoles={roles} />
            <ForceSignOutButton
              userId={user.id}
              disabled={user.id === caller?.id || !isOnline}
            />
            <LockUserButton userId={user.id} isLocked={user.locked ?? false} />
            <DeleteUserButton userId={user.id} />
          </div>
        </div>

        <section
          aria-label={t("dashboard.users.detailsTitle")}
          className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm"
        >
          <dl className="grid gap-px bg-border sm:grid-cols-2">
            <DetailItem
              icon={User}
              label={t("dashboard.users.labels.username")}
              value={displayName}
            />
            <DetailItem
              icon={Mail}
              label={t("dashboard.users.labels.email")}
              value={email}
            />
            <DetailItem
              icon={CalendarDays}
              label={t("dashboard.users.labels.memberSince")}
              value={createdAt}
            />
            <DetailItem
              icon={ShieldCheck}
              label={t("dashboard.users.labels.status")}
              value={
                <Badge variant={user.locked ? "destructive" : "secondary"}>
                  {statusLabel}
                </Badge>
              }
            />
            <DetailItem
              icon={Activity}
              label={t("dashboard.users.labels.presence")}
              value={
                <span className="flex items-center gap-2">
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      isOnline ? "bg-green-500" : "bg-muted-foreground/40"
                    }`}
                  />
                  <span>{presenceLabel}</span>
                </span>
              }
            />
            <DetailItem
              icon={Users}
              label={t("dashboard.users.labels.roles")}
              value={
                <div className="flex flex-wrap gap-1.5">
                  {roles.map((role) => (
                    <Badge key={role} variant={roleBadgeVariant[role]}>
                      {t(getRoleLabelKey(role))}
                    </Badge>
                  ))}
                </div>
              }
            />
          </dl>
        </section>
      </div>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-h-24 gap-3 bg-card p-4 sm:p-5">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
        <Icon aria-hidden className="size-4" />
      </span>
      <div className="min-w-0 space-y-1">
        <dt className="text-xs font-medium uppercase text-muted-foreground">
          {label}
        </dt>
        <dd className="min-w-0 break-words text-sm font-medium leading-6">
          {value}
        </dd>
      </div>
    </div>
  );
}
