import type { TopMenuTreeNode } from "@/data/top-menu";

type BackendMenuAccess = {
  isBackendUser: boolean;
  isAdmin: boolean;
  hasWebshopShell?: boolean;
};

type BackendMenuNodeDefinition = {
  id: string;
  href: string;
  label: string;
  adminOnly?: boolean;
  children?: readonly BackendMenuNodeDefinition[];
};

export type BackendMenuLink = {
  id: string;
  href: string;
  label: string;
  isChild?: boolean;
};

export const WEBSHOP_BACKEND_CHILD_LINKS = [
  {
    id: "webshop-categories",
    href: "/dashboard/webshop/categories",
    label: "Categories",
  },
  {
    id: "webshop-orders",
    href: "/dashboard/webshop/orders",
    label: "Orders",
  },
  {
    id: "webshop-wishlist",
    href: "/dashboard/webshop/wishlists",
    label: "Wishlist",
  },
  {
    id: "webshop-settings",
    href: "/dashboard/webshop/settings",
    label: "Settings",
  },
  {
    id: "webshop-products",
    href: "/dashboard/webshop/products",
    label: "Products",
  },
  {
    id: "webshop-promotions",
    href: "/dashboard/webshop/promotions",
    label: "Promotions",
  },
  {
    id: "webshop-storefront",
    href: "/dashboard/webshop/storefront",
    label: "Storefront",
  },
] as const satisfies readonly BackendMenuNodeDefinition[];

const BACKEND_MENU: readonly BackendMenuNodeDefinition[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    label: "Dashboard",
    children: [
      {
        id: "global-settings",
        href: "/dashboard/global-settings",
        label: "Global Settings",
        adminOnly: true,
      },
    ],
  },
  {
    id: "content",
    href: "/dashboard/content",
    label: "Content",
    children: [
      {
        id: "content-categories",
        href: "/dashboard/content-categories",
        label: "Content Categories",
        adminOnly: true,
      },
    ],
  },
  {
    id: "webshop",
    href: "/dashboard/webshop",
    label: "Webshop",
    adminOnly: true,
    children: WEBSHOP_BACKEND_CHILD_LINKS,
  },
  {
    id: "filemanager",
    href: "/dashboard/filemanager",
    label: "File Manager",
    children: [
      {
        id: "gallerymanager",
        href: "/dashboard/gallerymanager",
        label: "Gallery Manager",
      },
    ],
  },
  { id: "users", href: "/dashboard/users", label: "Users", adminOnly: true },
  { id: "menus", href: "/dashboard/menus", label: "Menus", adminOnly: true },
  {
    id: "form-builder",
    href: "/dashboard/form-builder",
    label: "Form Builder",
    adminOnly: true,
  },
];

export function getBackendMenuTree({
  isBackendUser,
  isAdmin,
  hasWebshopShell = false,
}: BackendMenuAccess): TopMenuTreeNode[] {
  if (!isBackendUser) return [];
  return BACKEND_MENU.map((item, order) =>
    toTopMenuNode(item, null, order, { hasWebshopShell, isAdmin }),
  ).filter((item): item is TopMenuTreeNode => item !== null);
}

export function getBackendMenuLinks(
  access: BackendMenuAccess,
): BackendMenuLink[] {
  const links: BackendMenuLink[] = [];

  function walk(items: TopMenuTreeNode[], isChild = false) {
    for (const item of items) {
      links.push({
        id: item.id,
        href: item.url,
        label: item.label,
        isChild: isChild || undefined,
      });
      walk(item.children, true);
    }
  }

  walk(getBackendMenuTree(access));
  return links;
}

function toTopMenuNode(
  item: BackendMenuNodeDefinition,
  parentId: string | null,
  order: number,
  access: { hasWebshopShell: boolean; isAdmin: boolean },
): TopMenuTreeNode | null {
  if (item.id === "webshop" && !access.hasWebshopShell) return null;
  if (item.adminOnly && !access.isAdmin) return null;

  const id = `backend:${item.id}`;
  return {
    id,
    label: item.label,
    url: item.href,
    parentId,
    order,
    contentId: null,
    categoryId: null,
    target: "_self",
    children: (item.children ?? [])
      .map((child, childOrder) => toTopMenuNode(child, id, childOrder, access))
      .filter((child): child is TopMenuTreeNode => child !== null),
  };
}
