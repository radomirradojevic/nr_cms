import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CreditCard,
  ExternalLink,
  Monitor,
  Package,
  Pencil,
  Plus,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  TicketPercent,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { WebshopAddonRequired } from "@/components/webshop-addon-required";
import { WebshopLicenseActivation } from "@/components/webshop-license-activation";
import { listContent } from "@/data/content";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { resolveWebshopAddonState } from "@/lib/webshop-addon/license";
import { activateWebshopAddonAction } from "./actions";

const PLACEHOLDER_SECTIONS = [
  { label: "Products", icon: Package },
  { label: "Categories", icon: Tags },
  { label: "Orders", icon: ShoppingCart },
  { label: "Payments", icon: CreditCard },
  { label: "Storefront", icon: Store },
  { label: "Coupons", icon: TicketPercent },
  { label: "Settings", icon: Settings },
];

export default async function WebshopDashboardPage() {
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) redirect("/dashboard");

  const addonState = await resolveWebshopAddonState();
  if (addonState.status === "ready") {
    return addonState.addon.renderDashboard({
      licenseMode: "ready",
      path: [],
      userId: user!.id,
    });
  }
  if (addonState.status === "license_expired") {
    return addonState.addon.renderDashboard({
      licenseMode: "edit_existing_only",
      path: [],
      userId: user!.id,
    });
  }

  const { rows } = await listContent({
    page: 1,
    pageSize: 1,
    contentType: "webshop",
    deleted: "exclude",
  });
  const webshop = rows[0];

  return (
    <div className="mx-auto w-full max-w-[var(--backend-content-max-width)] space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Webshop</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Paid commerce add-on foundation and CMS shell.
          </p>
        </div>
        {webshop ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/dashboard/content/${webshop.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit shell
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link
                href={`/${webshop.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                View storefront
              </Link>
            </Button>
          </div>
        ) : (
          <Button asChild>
            <Link href="/dashboard/content/new/webshop">
              <Plus className="h-4 w-4" />
              Set up Webshop
            </Link>
          </Button>
        )}
      </div>

      {addonState.status === "license_required" ||
      addonState.status === "not_installed" ||
      addonState.status === "license_invalid" ? (
        <WebshopLicenseActivation action={activateWebshopAddonAction} />
      ) : null}

      <WebshopAddonRequired state={addonState} />

      {!webshop ? (
        <div className="rounded-lg border border-dashed bg-background p-8">
          <div className="flex max-w-2xl gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border bg-muted/40">
              <Store className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">No Webshop shell yet</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create the CMS entry that owns the shop slug, SEO, status,
                  visibility, and routing.
                </p>
              </div>
              <Button asChild>
                <Link href="/dashboard/content/new/webshop">
                  <Plus className="h-4 w-4" />
                  Create CMS shell
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-background p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Meta label="Title" value={webshop.title} />
              <Meta label="Slug" value={`/${webshop.slug}`} />
              <Meta label="Status" value={webshop.status} />
              <Meta label="Category" value={webshop.categoryName} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PLACEHOLDER_SECTIONS.map(({ label, icon: Icon }) => (
              <div key={label} className="rounded-lg border bg-background p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-medium">{label}</h2>
                    <p className="text-xs text-muted-foreground">
                      Available after add-on activation.
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-medium">
                    Public Preview
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Uses the CMS shell renderer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </div>
      <div className="truncate text-sm">{value}</div>
    </div>
  );
}
