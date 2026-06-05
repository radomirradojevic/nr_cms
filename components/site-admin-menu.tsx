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
import { headerNavTriggerClassName } from "@/components/site-header-nav-styles";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { getRoles, hasRole } from "@/lib/roles";

type SiteAdminMenuProps = {
  fallbackIsBackendUser?: boolean;
  fallbackIsAdmin?: boolean;
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
}: Required<SiteAdminMenuProps> & {
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
}: SiteAdminMenuProps) {
  const { isAdmin, isBackendUser } = useEffectiveBackendState({
    fallbackIsBackendUser,
    fallbackIsAdmin,
  });

  if (!isBackendUser) return null;

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
                          className={submenuLinkClassName}
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
                className={cn(
                  navigationMenuTriggerStyle(),
                  headerNavTriggerClassName,
                )}
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
                          className={submenuLinkClassName}
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
                className={cn(
                  navigationMenuTriggerStyle(),
                  headerNavTriggerClassName,
                )}
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
                      className={submenuLinkClassName}
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
                <SiteTopMenuLink href="/dashboard/menus" label="Menus" />
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

export function SiteAdminMenuLauncher({
  fallbackIsBackendUser = false,
  fallbackIsAdmin = false,
  fallbackIsLoggedIn = false,
}: SiteAdminMenuLauncherProps) {
  const { openSignIn, openSignUp, signOut } = useClerk();
  const { displayName, isAdmin, isBackendUser, isSignedIn } =
    useEffectiveBackendState({
      fallbackIsBackendUser,
      fallbackIsAdmin,
      fallbackIsLoggedIn,
    });

  const authLabel = displayName ?? "Account";

  return (
    <div className="fixed left-[calc(env(safe-area-inset-left,0px)+0.75rem)] top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-[70]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-9 rounded-full border bg-background/95 shadow-lg shadow-black/15 backdrop-blur supports-[backdrop-filter]:bg-background/80"
            aria-label="Open site menu"
            title="Site menu"
          >
            <LayoutDashboard aria-hidden className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className="w-56">
          {isBackendUser && (
            <>
              <DropdownMenuLabel>Backend menu</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/dashboard">Dashboard</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/content">Content</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/filemanager">File Manager</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/gallerymanager">Gallery Manager</Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/global-settings">
                      Global Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/content-categories">
                      Content Categories
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/users">Users</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/menus">Menus</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/form-builder">Form Builder</Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuLabel>
            {isSignedIn ? authLabel : "Account"}
          </DropdownMenuLabel>
          {isSignedIn ? (
            <DropdownMenuItem onSelect={() => void signOut()}>
              Sign out
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => openSignIn()}>
                Sign in
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openSignUp()}>
                Sign up
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
