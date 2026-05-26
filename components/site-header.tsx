import { SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";

import { SiteTopMenu } from "@/components/site-top-menu";
import { SiteTopMenuLink } from "@/components/site-top-menu-link";
import { SiteTopMenuParentTrigger } from "@/components/site-top-menu-parent-trigger";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { UserButtonClient } from "@/components/user-button-client";
import type { AppearanceSlotV1, HeaderRegionV1 } from "@/lib/appearance-recipe";
import { sanitizeCmsHtml } from "@/lib/content-sanitizer";
import type { ResolvedSiteLogo } from "@/lib/global-settings";
import { cn } from "@/lib/utils";

type SlotOf<T extends AppearanceSlotV1["type"]> = Extract<
  AppearanceSlotV1,
  { type: T }
>;

type SiteHeaderProps = {
  region: HeaderRegionV1;
  siteName: string;
  siteLogo: ResolvedSiteLogo | null;
  logoUrl: string | null;
  isBackendUser: boolean;
  isAdmin: boolean;
  isLoggedIn: boolean;
};

type HeaderContext = Pick<
  SiteHeaderProps,
  "isBackendUser" | "isAdmin" | "isLoggedIn"
>;

function slotIsVisible(
  slot: AppearanceSlotV1,
  context: HeaderContext,
): boolean {
  if (!slot.enabled) return false;

  switch (slot.visibility) {
    case "signed-out":
      return !context.isLoggedIn;
    case "signed-in":
      return context.isLoggedIn;
    case "backend-user":
      return context.isBackendUser;
    case "admin":
      return context.isAdmin;
    case "always":
      return true;
  }
}

function findEnabledSlot<T extends AppearanceSlotV1["type"]>(
  slots: AppearanceSlotV1[],
  type: T,
  context: HeaderContext,
): SlotOf<T> | null {
  return (slots.find(
    (slot) => slot.type === type && slotIsVisible(slot, context),
  ) ?? null) as SlotOf<T> | null;
}

export function resolveHeaderHeight(region: HeaderRegionV1): number {
  return region.heightPx > 0 ? region.heightPx : 64;
}

function renderSlotLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={className} rel="noreferrer" target="_blank">
      {children}
    </a>
  );
}

function renderBrandSlot({
  slot,
  siteName,
  siteLogo,
  logoUrl,
  className,
}: {
  slot: SlotOf<"Brand"> | null;
  siteName: string;
  siteLogo: ResolvedSiteLogo | null;
  logoUrl: string | null;
  className?: string;
}) {
  if (!slot) return null;

  return (
    <Link
      href="/"
      className={cn(
        "text-xl font-bold tracking-tight text-gray-400 hover:text-foreground transition-colors flex items-center gap-2 shrink-0",
        className,
      )}
    >
      {logoUrl && slot.showLogo && (
        <div
          style={{
            width: "calc(var(--header-h) * 0.85)",
            height: "calc(var(--header-h) * 0.85)",
            borderRadius: "50%",
            border: "1px solid #6b7280",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt={siteLogo?.alt ?? siteName}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
            }}
            className="object-contain"
          />
        </div>
      )}
      {slot.showSiteName && <span>{siteName}</span>}
    </Link>
  );
}

function renderHeaderHtmlSlot(
  slot: SlotOf<"CustomHtml"> | SlotOf<"RichText"> | null,
  className?: string,
) {
  if (!slot?.html) return null;

  return (
    <div
      className={cn(
        "flex-1 min-w-0 self-stretch overflow-hidden flex items-center",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(slot.html) }}
    />
  );
}

function renderSiteMenuSlot({
  slot,
  isBackendUser,
  isAdmin,
  isLoggedIn,
}: {
  slot: SlotOf<"SiteMenu"> | null;
  isBackendUser: boolean;
  isAdmin: boolean;
  isLoggedIn: boolean;
}) {
  if (!slot) return null;

  return (
    <SiteTopMenu
      isBackendUser={isBackendUser}
      isAdmin={isAdmin}
      isLoggedIn={isLoggedIn}
    />
  );
}

function renderAdminMenuSlot({
  slot,
  isBackendUser,
  isAdmin,
}: {
  slot: SlotOf<"AdminMenu"> | null;
  isBackendUser: boolean;
  isAdmin: boolean;
}) {
  if (!slot || !isBackendUser) return null;

  return (
    <div className="hidden lg:block">
      <NavigationMenu viewport={false} aria-label="Admin navigation">
        <NavigationMenuList>
          <NavigationMenuItem>
            {isAdmin ? (
              <>
                <SiteTopMenuParentTrigger
                  url="/dashboard"
                  target="_self"
                  label="Dashboard"
                />
                <NavigationMenuContent>
                  <ul className="grid w-48 gap-1 p-2">
                    <li>
                      <NavigationMenuLink asChild>
                        <Link
                          href="/dashboard/global-settings"
                          className="block rounded px-3 py-2 text-sm transition-colors hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-foreground)] focus-visible:bg-[var(--nav-hover-bg)] focus-visible:text-[var(--nav-hover-foreground)] focus-visible:outline-none data-[active]:bg-[var(--nav-hover-bg)] data-[active]:text-[var(--nav-hover-foreground)]"
                        >
                          Global Settings
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </>
            ) : (
              <NavigationMenuLink
                asChild
                className={navigationMenuTriggerStyle()}
              >
                <Link href="/dashboard">Dashboard</Link>
              </NavigationMenuLink>
            )}
          </NavigationMenuItem>
          <NavigationMenuItem>
            {isAdmin ? (
              <>
                <SiteTopMenuParentTrigger
                  url="/dashboard/content"
                  target="_self"
                  label="Content"
                />
                <NavigationMenuContent>
                  <ul className="grid w-52 gap-1 p-2">
                    <li>
                      <NavigationMenuLink asChild>
                        <Link
                          href="/dashboard/content-categories"
                          className="block rounded px-3 py-2 text-sm transition-colors hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-foreground)] focus-visible:bg-[var(--nav-hover-bg)] focus-visible:text-[var(--nav-hover-foreground)] focus-visible:outline-none data-[active]:bg-[var(--nav-hover-bg)] data-[active]:text-[var(--nav-hover-foreground)]"
                        >
                          Content Categories
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </>
            ) : (
              <NavigationMenuLink
                asChild
                className={navigationMenuTriggerStyle()}
              >
                <Link href="/dashboard/content">Content</Link>
              </NavigationMenuLink>
            )}
          </NavigationMenuItem>
          <NavigationMenuItem>
            <SiteTopMenuParentTrigger
              url="/dashboard/filemanager"
              target="_self"
              label="File Manager"
            />
            <NavigationMenuContent>
              <ul className="grid w-52 gap-1 p-2">
                <li>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/dashboard/gallerymanager"
                      className="block rounded px-3 py-2 text-sm transition-colors hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-foreground)] focus-visible:bg-[var(--nav-hover-bg)] focus-visible:text-[var(--nav-hover-foreground)] focus-visible:outline-none data-[active]:bg-[var(--nav-hover-bg)] data-[active]:text-[var(--nav-hover-foreground)]"
                    >
                      Gallery Manager
                    </Link>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          {isAdmin && (
            <>
              <NavigationMenuItem>
                <SiteTopMenuLink href="/dashboard/users" label="Users" />
              </NavigationMenuItem>
              <NavigationMenuItem>
                <SiteTopMenuLink href="/dashboard/top-menu" label="Top Menu" />
              </NavigationMenuItem>
              <NavigationMenuItem>
                <SiteTopMenuLink
                  href="/dashboard/form-builder"
                  label="Form Builder"
                />
              </NavigationMenuItem>
            </>
          )}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}

function renderAuthControlsSlot({
  slot,
  isLoggedIn,
}: {
  slot: SlotOf<"AuthControls"> | null;
  isLoggedIn: boolean;
}) {
  if (!slot) return null;

  return (
    <div className="hidden lg:flex items-center gap-2">
      {!isLoggedIn ? (
        <>
          <SignInButton mode="modal">
            <Button variant="ghost" size="lg" className="cursor-pointer">
              Sign in
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button variant="outline" size="lg" className="cursor-pointer">
              Sign up
            </Button>
          </SignUpButton>
        </>
      ) : (
        <UserButtonClient />
      )}
    </div>
  );
}

function renderSearchSlot(slot: SlotOf<"Search"> | null, className?: string) {
  if (!slot) return null;

  return (
    <form
      action={slot.action}
      className={cn("hidden items-center lg:flex", className)}
      role="search"
      aria-label={slot.label}
    >
      <input
        type="search"
        name={slot.queryParam}
        placeholder={slot.placeholder}
        className="h-8 w-40 rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </form>
  );
}

function renderCtaSlot(slot: SlotOf<"CTA"> | null) {
  if (!slot?.href || !slot.label) return null;

  const variant =
    slot.style === "secondary"
      ? "outline"
      : slot.style === "link"
        ? "ghost"
        : "default";

  return (
    <Button asChild size="lg" variant={variant}>
      {renderSlotLink({ href: slot.href, children: slot.label })}
    </Button>
  );
}

export function SiteHeader({
  region,
  siteName,
  siteLogo,
  logoUrl,
  isBackendUser,
  isAdmin,
  isLoggedIn,
}: SiteHeaderProps) {
  const context = { isBackendUser, isAdmin, isLoggedIn };
  const brandSlot = findEnabledSlot(region.slots, "Brand", context);
  const customHtmlSlot = findEnabledSlot(region.slots, "CustomHtml", context);
  const richTextSlot = findEnabledSlot(region.slots, "RichText", context);
  const siteMenuSlot = findEnabledSlot(region.slots, "SiteMenu", context);
  const adminMenuSlot = findEnabledSlot(region.slots, "AdminMenu", context);
  const authControlsSlot = findEnabledSlot(
    region.slots,
    "AuthControls",
    context,
  );
  const searchSlot = findEnabledSlot(region.slots, "Search", context);
  const ctaSlot = findEnabledSlot(region.slots, "CTA", context);
  const headerH = resolveHeaderHeight(region);
  const headerStyle = {
    height: `${headerH}px`,
    ...(region.background ? { backgroundColor: region.background } : {}),
  };
  const brand = renderBrandSlot({
    slot: brandSlot,
    siteName,
    siteLogo,
    logoUrl,
  });
  const customContent = renderHeaderHtmlSlot(customHtmlSlot ?? richTextSlot);
  const siteMenu = renderSiteMenuSlot({
    slot: siteMenuSlot,
    isBackendUser,
    isAdmin,
    isLoggedIn,
  });
  const adminMenu = renderAdminMenuSlot({
    slot: adminMenuSlot,
    isBackendUser,
    isAdmin,
  });
  const authControls = renderAuthControlsSlot({
    slot: authControlsSlot,
    isLoggedIn,
  });
  const search = renderSearchSlot(searchSlot);
  const cta = renderCtaSlot(ctaSlot);
  const stickyClass = region.sticky && "sticky top-0 z-50";

  if (region.variant === "classic") {
    return (
      <header
        className={cn(
          "site-header bg-background flex items-center justify-between p-4 gap-4",
          stickyClass,
        )}
        style={headerStyle}
      >
        {brand}
        {customContent}
        <div className="flex items-center gap-4 shrink-0">
          {siteMenu}
          {adminMenu}
          {search}
          {cta}
          {authControls}
        </div>
      </header>
    );
  }

  if (region.variant === "centered") {
    return (
      <header
        className={cn(
          "site-header bg-background flex flex-col items-center justify-center px-4 py-3 text-center",
          stickyClass,
        )}
        style={headerStyle}
      >
        {renderBrandSlot({
          slot: brandSlot,
          siteName,
          siteLogo,
          logoUrl,
          className: "justify-center",
        })}
        {renderHeaderHtmlSlot(
          customHtmlSlot ?? richTextSlot,
          "max-h-10 justify-center text-center",
        )}
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-3">
          {siteMenu}
          {adminMenu}
          {search}
          {cta}
          {authControls}
        </div>
      </header>
    );
  }

  if (region.variant === "split") {
    return (
      <header
        className={cn(
          "site-header bg-background grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-4 py-3",
          stickyClass,
        )}
        style={headerStyle}
      >
        <div className="min-w-0 justify-self-start">{brand}</div>
        <div className="flex min-w-0 items-center justify-center gap-3">
          {siteMenu}
          {adminMenu}
        </div>
        <div className="flex min-w-0 items-center justify-end gap-3">
          {customContent}
          {search}
          {cta}
          {authControls}
        </div>
      </header>
    );
  }

  if (region.variant === "compact-app") {
    return (
      <header
        className={cn(
          "site-header bg-background flex items-center justify-between gap-3 border-b px-3 py-2",
          stickyClass,
        )}
        style={headerStyle}
      >
        {renderBrandSlot({
          slot: brandSlot,
          siteName,
          siteLogo,
          logoUrl,
          className: "text-base",
        })}
        {renderHeaderHtmlSlot(customHtmlSlot ?? richTextSlot, "hidden md:flex")}
        <div className="flex items-center gap-2 shrink-0">
          {siteMenu}
          {adminMenu}
          {search}
          {cta}
          {authControls}
        </div>
      </header>
    );
  }

  if (region.variant === "editorial-masthead") {
    return (
      <header
        className={cn(
          "site-header bg-background flex flex-col justify-center gap-2 border-b px-4 py-3",
          stickyClass,
        )}
        style={headerStyle}
      >
        <div className="flex min-w-0 items-center justify-center">
          {renderBrandSlot({
            slot: brandSlot,
            siteName,
            siteLogo,
            logoUrl,
            className: "justify-center text-2xl",
          })}
        </div>
        {renderHeaderHtmlSlot(
          customHtmlSlot ?? richTextSlot,
          "max-h-10 justify-center text-center",
        )}
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-3 border-t pt-2">
          {siteMenu}
          {adminMenu}
          {search}
          {cta}
          {authControls}
        </div>
      </header>
    );
  }

  return (
    <header
      className={cn(
        "site-header bg-background flex items-center justify-between gap-4 px-4 py-3",
        stickyClass,
      )}
      style={headerStyle}
    >
      {brand}
      {customContent}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden items-center gap-3 lg:flex">
          {siteMenu}
          {adminMenu}
        </div>
        {search}
        {cta}
        {authControls}
      </div>
    </header>
  );
}
