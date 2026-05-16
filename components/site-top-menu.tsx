import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getTopMenuTreeForViewer, type TopMenuTreeNode } from "@/data/top-menu";
import { getRoles } from "@/lib/roles";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { SiteTopMenuParentTrigger } from "@/components/site-top-menu-parent-trigger";
import { SiteTopMenuMobile } from "@/components/site-top-menu-mobile";

function isExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

function MenuLink({
  url,
  target,
  children,
  className,
}: {
  url: string;
  target: "_self" | "_blank";
  children: React.ReactNode;
  className?: string;
}) {
  if (isExternal(url)) {
    return (
      <a
        href={url}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={url} target={target} className={className}>
      {children}
    </Link>
  );
}

export async function SiteTopMenu({
  isBackendUser = false,
  isAdmin = false,
  isLoggedIn = false,
}: {
  isBackendUser?: boolean;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
}) {
  const me = await currentUser();
  const viewerRoles = me ? getRoles(me.publicMetadata) : null;
  const tree = await getTopMenuTreeForViewer(viewerRoles);

  if (process.env.NODE_ENV === "production") {
    console.log(
      "[top-menu] SiteTopMenu render",
      JSON.stringify({
        roots: tree.length,
        labels: tree.map((t) => t.label),
      }),
    );
  }

  return (
    <>
      {/* Desktop navigation — visible on lg and above */}
      {tree.length > 0 && (
        <div className="hidden lg:block">
          <NavigationMenu viewport={false}>
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
      />
    </>
  );
}

function RootItem({ item }: { item: TopMenuTreeNode }) {
  if (item.children.length === 0) {
    return (
      <NavigationMenuItem>
        <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
          <MenuLink url={item.url} target={item.target}>
            {item.label}
          </MenuLink>
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
  return (
    <li>
      <NavigationMenuLink asChild>
        <MenuLink
          url={item.url}
          target={item.target}
          className="block rounded px-3 py-2 text-sm transition-colors hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-foreground)] focus-visible:bg-[var(--nav-hover-bg)] focus-visible:text-[var(--nav-hover-foreground)] focus-visible:outline-none data-[active]:bg-[var(--nav-hover-bg)] data-[active]:text-[var(--nav-hover-foreground)]"
        >
          {item.label}
        </MenuLink>
      </NavigationMenuLink>
      {item.children.length > 0 && (
        <ul className="mt-1 ml-3 space-y-1 border-l border-border pl-2">
          {item.children.map((c) => (
            <SubmenuItem key={c.id} item={c} />
          ))}
        </ul>
      )}
    </li>
  );
}
