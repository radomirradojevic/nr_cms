import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import type { ComponentProps } from "react";

import { SiteAdminMenu } from "@/components/site-admin-menu";
import { SiteSearch } from "@/components/site-search";
import { SiteTopMenu } from "@/components/site-top-menu";
import { Button } from "@/components/ui/button";
import { UserButtonClient } from "@/components/user-button-client";
import type { AppearanceSlotV1, HeaderRegionV1 } from "@/lib/appearance-recipe";
import { sanitizeCmsHtml } from "@/lib/content-sanitizer";
import type { HeaderSettings, ResolvedSiteLogo } from "@/lib/global-settings";
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
  headerSettings: HeaderSettings;
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

function findEnabledTypeSlot<T extends AppearanceSlotV1["type"]>(
  slots: AppearanceSlotV1[],
  type: T,
): SlotOf<T> | null {
  return (slots.find((slot) => slot.type === type && slot.enabled) ??
    null) as SlotOf<T> | null;
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
  headerSettings,
  className,
  logoSize = "calc(var(--header-h) * 0.85)",
}: {
  slot: SlotOf<"Brand"> | null;
  siteName: string;
  siteLogo: ResolvedSiteLogo | null;
  logoUrl: string | null;
  headerSettings: HeaderSettings;
  className?: string;
  logoSize?: string;
}) {
  if (!slot) return null;

  const logoBorderRadius =
    headerSettings.logoBorderShape === "square" ? "0" : "50%";
  const logoBorderColor =
    headerSettings.logoBorderColorMode === "custom" &&
    headerSettings.logoBorderColor
      ? headerSettings.logoBorderColor
      : "var(--border)";

  return (
    <Link
      href="/"
      className={cn(
        "text-xl font-bold leading-none tracking-tight text-gray-400 hover:text-foreground transition-colors flex items-center gap-2 shrink-0",
        className,
      )}
    >
      {logoUrl && slot.showLogo && (
        <div
          style={{
            width: logoSize,
            height: logoSize,
            borderRadius: logoBorderRadius,
            border: headerSettings.logoBorderEnabled
              ? `1px solid ${logoBorderColor}`
              : "0",
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
              borderRadius: logoBorderRadius,
            }}
            className="block object-contain"
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
  if (!slot) return null;

  return (
    <SiteAdminMenu
      fallbackIsBackendUser={isBackendUser}
      fallbackIsAdmin={isAdmin}
    />
  );
}

function renderAuthControlsSlot({
  slot,
  className,
  buttonSize = "lg",
  signInClassName,
  signUpClassName,
}: {
  slot: SlotOf<"AuthControls"> | null;
  isLoggedIn: boolean;
  className?: string;
  buttonSize?: ComponentProps<typeof Button>["size"];
  signInClassName?: string;
  signUpClassName?: string;
}) {
  if (!slot) return null;

  return (
    <div className={cn("hidden lg:flex items-center gap-2", className)}>
      <Show when="signed-out">
        <>
          <SignInButton mode="modal">
            <Button
              variant="ghost"
              size={buttonSize}
              className={cn("cursor-pointer", signInClassName)}
            >
              Sign in
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button
              variant="outline"
              size={buttonSize}
              className={cn("cursor-pointer", signUpClassName)}
            >
              Sign up
            </Button>
          </SignUpButton>
        </>
      </Show>
      <Show when="signed-in">
        <UserButtonClient />
      </Show>
    </div>
  );
}

function renderSearchSlot(
  slot: SlotOf<"Search"> | null,
  className?: string,
  inputClassName?: string,
) {
  if (!slot) return null;

  return (
    <SiteSearch
      label={slot.label}
      placeholder={slot.placeholder}
      contentTypes={slot.contentTypes}
      className={className}
      inputClassName={inputClassName}
    />
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
  headerSettings,
  isBackendUser,
  isAdmin,
  isLoggedIn,
}: SiteHeaderProps) {
  const context = { isBackendUser, isAdmin, isLoggedIn };
  const brandSlot = findEnabledSlot(region.slots, "Brand", context);
  const customHtmlSlot = findEnabledSlot(region.slots, "CustomHtml", context);
  const richTextSlot = findEnabledSlot(region.slots, "RichText", context);
  const siteMenuSlot = findEnabledSlot(region.slots, "SiteMenu", context);
  const adminMenuSlot = findEnabledTypeSlot(region.slots, "AdminMenu");
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
    headerSettings,
    logoSize:
      region.variant === "split"
        ? "clamp(3rem, calc(var(--header-h) - 1.5rem), 4.5rem)"
        : undefined,
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
          "site-header bg-background flex flex-col items-center justify-center gap-2 px-4 py-2 text-center",
          stickyClass,
        )}
        style={{
          minHeight: `${headerH}px`,
          ...(region.background ? { backgroundColor: region.background } : {}),
        }}
      >
        {renderBrandSlot({
          slot: brandSlot,
          siteName,
          siteLogo,
          logoUrl,
          headerSettings,
          className: "justify-center",
          logoSize: "clamp(2.25rem, calc(var(--header-h) * 0.44), 4.5rem)",
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
          headerSettings,
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
          "site-header bg-background flex flex-col justify-center gap-3 border-b px-4 py-3",
          stickyClass,
        )}
        style={{
          minHeight: `${headerH}px`,
          ...(region.background ? { backgroundColor: region.background } : {}),
        }}
      >
        <div className="grid w-full min-w-0 grid-cols-1 items-center gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4">
          <div className="hidden min-w-0 justify-self-start lg:block">
            {renderSearchSlot(
              searchSlot,
              "flex",
              "w-56 rounded-full border-border/80 bg-background/70 px-3",
            )}
          </div>
          {renderBrandSlot({
            slot: brandSlot,
            siteName,
            siteLogo,
            logoUrl,
            headerSettings,
            className: "justify-center justify-self-center text-2xl",
            logoSize: "clamp(4rem, calc(var(--header-h) * 0.55), 6rem)",
          })}
          {renderAuthControlsSlot({
            slot: authControlsSlot,
            isLoggedIn,
            className: "justify-self-end gap-1.5",
            buttonSize: "sm",
            signInClassName:
              "rounded-full px-3 text-foreground/75 hover:text-foreground",
            signUpClassName: "rounded-full border-border/80 bg-background/70 px-3",
          })}
        </div>
        {renderHeaderHtmlSlot(
          customHtmlSlot ?? richTextSlot,
          "max-h-10 justify-center text-center",
        )}
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-3 border-t pt-2">
          {siteMenu}
          {adminMenu}
          {cta}
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
