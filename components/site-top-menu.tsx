import { getTopMenuTreeForViewer, type TopMenuTreeNode } from "@/data/top-menu";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles } from "@/lib/roles";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { headerNavTriggerClassName } from "@/components/site-header-nav-styles";
import { SiteTopMenuParentTrigger } from "@/components/site-top-menu-parent-trigger";
import { SiteTopMenuMobile } from "@/components/site-top-menu-mobile";
import { getTranslations } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

const submenuLinkClassName =
  "block rounded px-3 py-2 text-sm transition-colors hover:!bg-[var(--nav-hover-bg)] hover:!text-[var(--nav-hover-foreground)] focus-visible:!bg-[var(--nav-hover-bg)] focus-visible:!text-[var(--nav-hover-foreground)] focus-visible:outline-none data-active:!bg-[var(--nav-hover-bg)] data-active:!text-[var(--nav-hover-foreground)] data-[active]:!bg-[var(--nav-hover-bg)] data-[active]:!text-[var(--nav-hover-foreground)]";

function isExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

export async function SiteTopMenu({
  menuId,
  isBackendUser = false,
  isAdmin = false,
  isLoggedIn = false,
  showMobileAuthControls = true,
  showMobileBackendMenu = true,
  hasLicenseServerShell = false,
  hasWebshopShell = false,
}: {
  menuId: string | null;
  isBackendUser?: boolean;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
  showMobileAuthControls?: boolean;
  showMobileBackendMenu?: boolean;
  hasLicenseServerShell?: boolean;
  hasWebshopShell?: boolean;
}) {
  const me = menuId ? await getOptionalCurrentUser(true) : null;
  const viewerRoles = me ? getRoles(me.publicMetadata) : null;
  const tree = menuId ? await getTopMenuTreeForViewer(menuId, viewerRoles) : [];
  const t = await getTranslations("frontend");

  return (
    <>
      {/* Desktop navigation — visible on lg and above */}
      {tree.length > 0 && (
        <div className="hidden lg:block">
          <NavigationMenu
            viewport={false}
            aria-label={t("shell.siteNavigation")}
          >
            <NavigationMenuList>
              {tree.map((item) => (
                <RootItem key={item.id} item={item} />
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      )}
      {/* Mobile/tablet hamburger — hidden on lg and above */}
      <SiteTopMenuMobile
        tree={tree}
        isBackendUser={isBackendUser}
        isAdmin={isAdmin}
        isLoggedIn={isLoggedIn}
        showAuthControls={showMobileAuthControls}
        showBackendMenu={showMobileBackendMenu}
        hasLicenseServerShell={hasLicenseServerShell}
        hasWebshopShell={hasWebshopShell}
      />
    </>
  );
}

function RootItem({ item }: { item: TopMenuTreeNode }) {
  if (item.children.length === 0) {
    const external = isExternal(item.url);
    return (
      <NavigationMenuItem>
        <NavigationMenuLink
          href={item.url}
          target={item.target}
          rel={
            external && item.target === "_blank"
              ? "noopener noreferrer"
              : undefined
          }
          className={cn(
            navigationMenuTriggerStyle(),
            headerNavTriggerClassName,
          )}
        >
          {item.label}
        </NavigationMenuLink>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem>
      <SiteTopMenuParentTrigger
        url={item.url}
        target={item.target}
        label={item.label}
      />
      <NavigationMenuContent>
        <ul className="grid w-[240px] gap-1 p-2">
          {item.children.map((child) => (
            <SubmenuItem key={child.id} item={child} />
          ))}
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

function SubmenuItem({ item }: { item: TopMenuTreeNode }) {
  const external = isExternal(item.url);
  return (
    <li>
      <NavigationMenuLink
        href={item.url}
        target={item.target}
        rel={
          external && item.target === "_blank"
            ? "noopener noreferrer"
            : undefined
        }
        className={submenuLinkClassName}
      >
        {item.label}
      </NavigationMenuLink>
      {item.children.length > 0 && (
        <ul className="mt-1 ms-3 space-y-1 border-s border-border ps-2">
          {item.children.map((c) => (
            <SubmenuItem key={c.id} item={c} />
          ))}
        </ul>
      )}
    </li>
  );
}
