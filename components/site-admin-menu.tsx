"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SiteTopMenuLink } from "@/components/site-top-menu-link";
import { SiteTopMenuParentTrigger } from "@/components/site-top-menu-parent-trigger";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { useTranslations } from "@/components/i18n-provider";
import { getBackendMenuLinks, getBackendMenuTree } from "@/lib/backend-menu";
import { getRoles, hasRole } from "@/lib/roles";

type SiteAdminMenuProps = {
  fallbackIsBackendUser?: boolean;
  fallbackIsAdmin?: boolean;
  hasLicenseServerShell?: boolean;
  hasWebshopShell?: boolean;
};

type SiteAdminMenuLauncherProps = SiteAdminMenuProps & {
  fallbackIsLoggedIn?: boolean;
};

const submenuLinkClassName =
  "block rounded px-3 py-2 text-sm transition-colors hover:!bg-[var(--nav-hover-bg)] hover:!text-[var(--nav-hover-foreground)] focus-visible:!bg-[var(--nav-hover-bg)] focus-visible:!text-[var(--nav-hover-foreground)] focus-visible:outline-none data-active:!bg-[var(--nav-hover-bg)] data-active:!text-[var(--nav-hover-foreground)] data-[active]:!bg-[var(--nav-hover-bg)] data-[active]:!text-[var(--nav-hover-foreground)]";

function useEffectiveBackendState({
  fallbackIsBackendUser,
  fallbackIsAdmin,
  fallbackIsLoggedIn = false,
}: {
  fallbackIsBackendUser: boolean;
  fallbackIsAdmin: boolean;
  fallbackIsLoggedIn?: boolean;
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const roles = isLoaded && isSignedIn ? getRoles(user?.publicMetadata) : [];
  const effectiveIsSignedIn = isLoaded
    ? Boolean(isSignedIn)
    : fallbackIsLoggedIn;
  const isAdmin = isLoaded ? hasRole(roles, "admin") : fallbackIsAdmin;
  const isBackendUser = isLoaded
    ? hasRole(roles, "admin") ||
      hasRole(roles, "publisher") ||
      hasRole(roles, "author")
    : fallbackIsBackendUser;
  const displayName =
    user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress;

  return {
    displayName,
    isAdmin,
    isBackendUser,
    isSignedIn: effectiveIsSignedIn,
  };
}

export function SiteAdminMenu({
  fallbackIsBackendUser = false,
  fallbackIsAdmin = false,
  hasLicenseServerShell = false,
  hasWebshopShell = false,
}: SiteAdminMenuProps) {
  const t = useTranslations();
  const { isAdmin, isBackendUser } = useEffectiveBackendState({
    fallbackIsBackendUser,
    fallbackIsAdmin,
  });
  const menuTree = getBackendMenuTree({
    hasLicenseServerShell,
    hasWebshopShell,
    isAdmin,
    isBackendUser,
    t,
  });

  if (!isBackendUser) return null;

  return (
    <div className="hidden lg:block">
      <NavigationMenu viewport={false} aria-label={t("shell.adminNavigation")}>
        <NavigationMenuList>
          {menuTree.map((item) => (
            <NavigationMenuItem key={item.id}>
              {item.children.length > 0 ? (
                <>
                  <SiteTopMenuParentTrigger
                    url={item.url}
                    target={item.target}
                    label={item.label}
                  />
                  <NavigationMenuContent>
                    <ul className="grid w-52 gap-1 p-2">
                      {item.children.map((child) => (
                        <li key={child.id}>
                          <NavigationMenuLink asChild>
                            <Link
                              href={child.url}
                              className={submenuLinkClassName}
                            >
                              {child.label}
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </>
              ) : (
                <SiteTopMenuLink href={item.url} label={item.label} />
              )}
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}

export function SiteAdminMenuLauncher({
  fallbackIsBackendUser = false,
  fallbackIsAdmin = false,
  fallbackIsLoggedIn = false,
  hasLicenseServerShell = false,
  hasWebshopShell = false,
}: SiteAdminMenuLauncherProps) {
  const t = useTranslations();
  const { openSignIn, openSignUp, signOut } = useClerk();
  const { displayName, isAdmin, isBackendUser, isSignedIn } =
    useEffectiveBackendState({
      fallbackIsBackendUser,
      fallbackIsAdmin,
      fallbackIsLoggedIn,
    });
  const backendLinks = getBackendMenuLinks({
    hasLicenseServerShell,
    hasWebshopShell,
    isAdmin,
    isBackendUser,
    t,
  });

  const authLabel = displayName ?? t("common.auth.account");

  return (
    <div className="fixed start-[calc(env(safe-area-inset-left,0px)+0.75rem)] top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-[70]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-9 rounded-full border bg-background/95 shadow-lg shadow-black/15 backdrop-blur supports-[backdrop-filter]:bg-background/80"
            aria-label={t("shell.openSiteMenu")}
            title={t("shell.siteMenu")}
          >
            <LayoutDashboard aria-hidden className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className="w-56">
          {isBackendUser && (
            <>
              <DropdownMenuLabel>{t("shell.backendMenu")}</DropdownMenuLabel>
              {backendLinks.map((link) => (
                <DropdownMenuItem asChild inset={link.isChild} key={link.id}>
                  <Link href={link.href}>{link.label}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuLabel>
            {isSignedIn ? authLabel : t("common.auth.account")}
          </DropdownMenuLabel>
          {isSignedIn ? (
            <DropdownMenuItem onSelect={() => void signOut()}>
              {t("common.auth.signOut")}
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => openSignIn()}>
                {t("common.auth.signIn")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openSignUp()}>
                {t("common.auth.signUp")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
