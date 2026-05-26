"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";

import { SiteTopMenuLink } from "@/components/site-top-menu-link";
import { SiteTopMenuParentTrigger } from "@/components/site-top-menu-parent-trigger";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { getRoles, hasRole } from "@/lib/roles";

type SiteAdminMenuProps = {
  fallbackIsBackendUser?: boolean;
  fallbackIsAdmin?: boolean;
};

export function SiteAdminMenu({
  fallbackIsBackendUser = false,
  fallbackIsAdmin = false,
}: SiteAdminMenuProps) {
  const { isLoaded, isSignedIn, user } = useUser();
  const roles = isLoaded && isSignedIn ? getRoles(user?.publicMetadata) : [];
  const isAdmin = isLoaded ? hasRole(roles, "admin") : fallbackIsAdmin;
  const isBackendUser = isLoaded
    ? hasRole(roles, "admin") ||
      hasRole(roles, "publisher") ||
      hasRole(roles, "author")
    : fallbackIsBackendUser;

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
