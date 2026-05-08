import Link from "next/link";
import { getTopMenuTree, type TopMenuTreeNode } from "@/data/top-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { SiteTopMenuParentTrigger } from "@/components/site-top-menu-parent-trigger";

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

export async function SiteTopMenu() {
  const tree = await getTopMenuTree();
  if (tree.length === 0) return null;

  return (
    <NavigationMenu>
      <NavigationMenuList>
        {tree.map((item) => (
          <RootItem key={item.id} item={item} />
        ))}
      </NavigationMenuList>
    </NavigationMenu>
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
          className="block rounded px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
        >
          {item.label}
        </MenuLink>
      </NavigationMenuLink>
      {item.children.length > 0 && (
        <ul className="ml-3 mt-1 border-l pl-2 space-y-1">
          {item.children.map((c) => (
            <SubmenuItem key={c.id} item={c} />
          ))}
        </ul>
      )}
    </li>
  );
}
