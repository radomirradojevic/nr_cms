import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Suspense } from "react";
import {
  FileText,
  FolderOpen,
  Images,
  Users,
  Tag,
  Menu,
  ClipboardList,
  Settings,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { getDashboardStats } from "@/data/dashboard";
import { getGlobalSettings } from "@/data/global-settings";
import { DashboardCard } from "@/app/dashboard/_components/dashboard-card";
import { getTranslations } from "@/lib/i18n/server";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { hasRole, getRoles } from "@/lib/roles";

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="h-48 animate-pulse bg-muted" />
      ))}
    </div>
  );
}

async function DashboardCards({ roles }: { roles: string[] }) {
  const t = await getTranslations("backend");
  const [stats, settings] = await Promise.all([
    getDashboardStats(),
    getGlobalSettings(),
  ]);
  const isAdmin = roles.includes("admin");
  const canAccessContent =
    roles.includes("admin") ||
    roles.includes("publisher") ||
    roles.includes("author");
  const bytesToMb = (bytes: number) => Math.round(bytes / 1024 / 1024);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <DashboardCard
        title={t("dashboard.nav.globalSettings")}
        description={t("dashboard.landing.cards.globalSettings.description")}
        icon={Settings}
        href="/dashboard/global-settings"
        actionLabel={t("dashboard.landing.cards.globalSettings.action")}
        emptyLabel={t("dashboard.landing.noDataYet")}
        showAction={isAdmin}
        stats={[
          {
            label: t("dashboard.landing.stats.maxUploadMb"),
            value: bytesToMb(settings.maxUploadSizeBytes),
          },
          {
            label: t("dashboard.landing.stats.batchUploadMb"),
            value: bytesToMb(settings.maxBatchUploadSizeBytes),
          },
          {
            label: t("dashboard.landing.stats.idleLogoutMin"),
            value: settings.sessionSecurity.idleLogoutMinutes,
          },
          {
            label: t("dashboard.landing.stats.sessionLimitMin"),
            value: settings.sessionSecurity.maxSessionDurationMinutes,
          },
        ]}
      />
      <DashboardCard
        title={t("dashboard.nav.content")}
        description={t("dashboard.landing.cards.content.description")}
        icon={FileText}
        href="/dashboard/content"
        actionLabel={t("dashboard.landing.cards.content.action")}
        emptyLabel={t("dashboard.landing.noDataYet")}
        showAction={canAccessContent}
        stats={[
          {
            label: t("dashboard.landing.stats.totalPages"),
            value: stats.content.totalPages,
          },
          {
            label: t("dashboard.landing.stats.totalBlogPosts"),
            value: stats.content.totalBlogPosts,
          },
          {
            label: t("dashboard.landing.stats.heroSliders"),
            value: stats.content.totalHeroSliders,
          },
          {
            label: t("dashboard.landing.stats.webshops"),
            value: stats.content.totalWebshops,
          },
        ]}
      />
      <DashboardCard
        title={t("dashboard.nav.fileManager")}
        description={t("dashboard.landing.cards.files.description")}
        icon={FolderOpen}
        href="/dashboard/filemanager"
        actionLabel={t("dashboard.landing.cards.files.action")}
        emptyLabel={t("dashboard.landing.noDataYet")}
        showAction={canAccessContent}
        stats={[
          {
            label: t("dashboard.landing.stats.totalFiles"),
            value: stats.files.total,
          },
          {
            label: t("dashboard.landing.stats.images"),
            value: stats.files.images,
          },
          {
            label: t("dashboard.landing.stats.videos"),
            value: stats.files.videos,
          },
          {
            label: t("dashboard.landing.stats.documents"),
            value: stats.files.documents,
          },
        ]}
      />
      <DashboardCard
        title={t("dashboard.nav.galleryManager")}
        description={t("dashboard.landing.cards.galleries.description")}
        icon={Images}
        href="/dashboard/gallerymanager"
        actionLabel={t("dashboard.landing.cards.galleries.action")}
        emptyLabel={t("dashboard.landing.noDataYet")}
        showAction={canAccessContent}
        stats={[
          {
            label: t("dashboard.landing.stats.totalGalleries"),
            value: stats.galleries.totalGalleries,
          },
          {
            label: t("dashboard.landing.stats.totalImages"),
            value: stats.galleries.totalImages,
          },
        ]}
      />
      <DashboardCard
        title={t("dashboard.nav.users")}
        description={t("dashboard.landing.cards.users.description")}
        icon={Users}
        href="/dashboard/users"
        actionLabel={t("dashboard.landing.cards.users.action")}
        emptyLabel={t("dashboard.landing.noDataYet")}
        showAction={isAdmin}
        stats={[
          {
            label: t("dashboard.landing.stats.totalUsers"),
            value: stats.users.total,
          },
          {
            label: t("dashboard.landing.stats.admins"),
            value: stats.users.admins,
          },
          {
            label: t("dashboard.landing.stats.publishers"),
            value: stats.users.publishers,
          },
          {
            label: t("dashboard.landing.stats.authors"),
            value: stats.users.authors,
          },
        ]}
      />
      <DashboardCard
        title={t("dashboard.landing.cards.categories.title")}
        description={t("dashboard.landing.cards.categories.description")}
        icon={Tag}
        href="/dashboard/content-categories"
        actionLabel={t("dashboard.landing.cards.categories.action")}
        emptyLabel={t("dashboard.landing.noDataYet")}
        showAction={isAdmin}
        stats={[
          {
            label: t("dashboard.landing.stats.totalCategories"),
            value: stats.categories.total,
          },
          {
            label: t("dashboard.landing.stats.pageCategories"),
            value: stats.categories.pageCategories,
          },
          {
            label: t("dashboard.landing.stats.blogCategories"),
            value: stats.categories.blogCategories,
          },
        ]}
      />
      <DashboardCard
        title={t("dashboard.nav.menus")}
        description={t("dashboard.landing.cards.menus.description")}
        icon={Menu}
        href="/dashboard/menus"
        actionLabel={t("dashboard.landing.cards.menus.action")}
        emptyLabel={t("dashboard.landing.noDataYet")}
        showAction={isAdmin}
        stats={[
          {
            label: t("dashboard.landing.stats.totalMenus"),
            value: stats.menus.totalMenus,
          },
          {
            label: t("dashboard.landing.stats.totalItems"),
            value: stats.menus.totalItems,
          },
          {
            label: t("dashboard.landing.stats.nestedItems"),
            value: stats.menus.nestedItems,
          },
        ]}
      />
      <DashboardCard
        title={t("dashboard.nav.formBuilder")}
        description={t("dashboard.landing.cards.forms.description")}
        icon={ClipboardList}
        href="/dashboard/form-builder"
        actionLabel={t("dashboard.landing.cards.forms.action")}
        emptyLabel={t("dashboard.landing.noDataYet")}
        showAction={isAdmin}
        stats={[
          {
            label: t("dashboard.landing.stats.totalForms"),
            value: stats.forms.totalForms,
          },
          {
            label: t("dashboard.landing.stats.totalSubmissions"),
            value: stats.forms.totalSubmissions,
          },
        ]}
      />
    </div>
  );
}

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const caller = await getOptionalCurrentUser();
  const roles = getRoles(caller?.publicMetadata);
  if (
    !hasRole(roles, "admin") &&
    !hasRole(roles, "publisher") &&
    !hasRole(roles, "author")
  ) {
    const t = await getTranslations("backend");

    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <div className="max-w-md rounded-lg border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold">
            {t("dashboard.accessUnavailable.title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("dashboard.accessUnavailable.description")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-6 gap-10">
      <div
        style={{
          width: "min(400px, 100%)",
          aspectRatio: "1 / 1",
          borderRadius: "50%",
          boxShadow:
            "0 0 0 4px #349aee, 0 0 32px 12px #349aee88, 0 0 64px 24px #349aee33",
        }}
        className="mt-6 shrink-0"
      >
        <Image
          src="/nr/images/logo/big/NR_Logo.png"
          alt="Night Raven Logo"
          width={400}
          height={400}
          style={{ borderRadius: "50%", width: "100%", height: "100%" }}
          priority
        />
      </div>
      <div className="w-full max-w-6xl">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardCards roles={roles} />
        </Suspense>
      </div>
    </div>
  );
}
