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
        title="Global Settings"
        description="Site-wide configuration"
        icon={Settings}
        href="/dashboard/global-settings"
        actionLabel="Manage Settings"
        showAction={isAdmin}
        stats={[
          {
            label: "Max Upload (MB)",
            value: bytesToMb(settings.maxUploadSizeBytes),
          },
          {
            label: "Batch Upload (MB)",
            value: bytesToMb(settings.maxBatchUploadSizeBytes),
          },
          {
            label: "Idle Logout (min)",
            value: settings.sessionSecurity.idleLogoutMinutes,
          },
          {
            label: "Session Limit (min)",
            value: settings.sessionSecurity.maxSessionDurationMinutes,
          },
        ]}
      />
      <DashboardCard
        title="Content"
        description="Pages, blog posts, and hero sliders"
        icon={FileText}
        href="/dashboard/content"
        actionLabel="Manage Content"
        showAction={canAccessContent}
        stats={[
          { label: "Total Pages", value: stats.content.totalPages },
          { label: "Total Blog Posts", value: stats.content.totalBlogPosts },
          { label: "Hero Sliders", value: stats.content.totalHeroSliders },
        ]}
      />
      <DashboardCard
        title="File Manager"
        description="Uploaded files and media"
        icon={FolderOpen}
        href="/dashboard/filemanager"
        actionLabel="Manage Files"
        showAction={canAccessContent}
        stats={[
          { label: "Total Files", value: stats.files.total },
          { label: "Images", value: stats.files.images },
          { label: "Videos", value: stats.files.videos },
          { label: "Documents", value: stats.files.documents },
        ]}
      />
      <DashboardCard
        title="Gallery Manager"
        description="Image galleries"
        icon={Images}
        href="/dashboard/gallerymanager"
        actionLabel="Manage Galleries"
        showAction={canAccessContent}
        stats={[
          { label: "Total Galleries", value: stats.galleries.totalGalleries },
          { label: "Total Images", value: stats.galleries.totalImages },
        ]}
      />
      <DashboardCard
        title="Users"
        description="Registered CMS users"
        icon={Users}
        href="/dashboard/users"
        actionLabel="Manage Users"
        showAction={isAdmin}
        stats={[
          { label: "Total Users", value: stats.users.total },
          { label: "Admins", value: stats.users.admins },
          { label: "Publishers", value: stats.users.publishers },
          { label: "Authors", value: stats.users.authors },
        ]}
      />
      <DashboardCard
        title="Content Categories"
        description="Page and blog categories"
        icon={Tag}
        href="/dashboard/content-categories"
        actionLabel="Manage Categories"
        showAction={isAdmin}
        stats={[
          { label: "Total Categories", value: stats.categories.total },
          { label: "Page Categories", value: stats.categories.pageCategories },
          { label: "Blog Categories", value: stats.categories.blogCategories },
        ]}
      />
      <DashboardCard
        title="Menus"
        description="Reusable navigation menus"
        icon={Menu}
        href="/dashboard/menus"
        actionLabel="Manage Menus"
        showAction={isAdmin}
        stats={[
          { label: "Total Menus", value: stats.menus.totalMenus },
          { label: "Total Items", value: stats.menus.totalItems },
          { label: "Nested Items", value: stats.menus.nestedItems },
        ]}
      />
      <DashboardCard
        title="Form Builder"
        description="Custom forms and submissions"
        icon={ClipboardList}
        href="/dashboard/form-builder"
        actionLabel="Manage Forms"
        showAction={isAdmin}
        stats={[
          { label: "Total Forms", value: stats.forms.totalForms },
          { label: "Total Submissions", value: stats.forms.totalSubmissions },
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
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <div className="max-w-md rounded-lg border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold">
            Dashboard access unavailable
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your session is signed in, but role information is still syncing.
            Refresh the page in a moment.
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
