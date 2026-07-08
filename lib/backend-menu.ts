import type { TopMenuTreeNode } from "@/data/top-menu";
import type { TranslationKey } from "@/lib/i18n/keys";
import { en } from "@/lib/i18n/messages/en";
import { createTranslator, type TranslateFn } from "@/lib/i18n/translate";

type BackendMenuAccess = {
  isBackendUser: boolean;
  isAdmin: boolean;
  hasLicenseServerShell?: boolean;
  hasWebshopShell?: boolean;
  t?: TranslateFn;
};

type BackendMenuNodeDefinition = {
  id: string;
  href: string;
  labelKey: TranslationKey;
  adminOnly?: boolean;
  children?: readonly BackendMenuNodeDefinition[];
};

export type BackendMenuLink = {
  id: string;
  href: string;
  label: string;
  isChild?: boolean;
};

const defaultTranslate = createTranslator(en, en, "en");

export const WEBSHOP_BACKEND_CHILD_LINKS = [
  {
    id: "webshop-settings",
    href: "/dashboard/webshop/settings",
    labelKey: "dashboard.nav.webshopSettings",
  },
  {
    id: "webshop-storefront",
    href: "/dashboard/webshop/storefront",
    labelKey: "dashboard.nav.webshopStorefront",
  },
  {
    id: "webshop-categories",
    href: "/dashboard/webshop/categories",
    labelKey: "dashboard.nav.webshopCategories",
  },
  {
    id: "webshop-products",
    href: "/dashboard/webshop/products",
    labelKey: "dashboard.nav.webshopProducts",
  },
  {
    id: "webshop-orders",
    href: "/dashboard/webshop/orders",
    labelKey: "dashboard.nav.webshopOrders",
  },
  {
    id: "webshop-wishlist",
    href: "/dashboard/webshop/wishlists",
    labelKey: "dashboard.nav.webshopWishlist",
  },
  {
    id: "webshop-promotions",
    href: "/dashboard/webshop/promotions",
    labelKey: "dashboard.nav.webshopPromotions",
  },
] as const satisfies readonly BackendMenuNodeDefinition[];

export const LICENSE_SERVER_BACKEND_CHILD_LINKS = [
  {
    id: "license-server-api-clients",
    href: "/dashboard/license-server/api-clients",
    labelKey: "dashboard.nav.licenseServerApiClients",
  },
  {
    id: "license-server-product-types",
    href: "/dashboard/license-server/product-types",
    labelKey: "dashboard.nav.licenseServerProductTypes",
  },
  {
    id: "license-server-licenses",
    href: "/dashboard/license-server/licenses",
    labelKey: "dashboard.nav.licenseServerLicenses",
  },
  {
    id: "license-server-events",
    href: "/dashboard/license-server/events",
    labelKey: "dashboard.nav.licenseServerEvents",
  },
] as const satisfies readonly BackendMenuNodeDefinition[];

const BACKEND_MENU: readonly BackendMenuNodeDefinition[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    labelKey: "dashboard.nav.dashboard",
    children: [
      {
        id: "global-settings",
        href: "/dashboard/global-settings",
        labelKey: "dashboard.nav.globalSettings",
        adminOnly: true,
      },
    ],
  },
  {
    id: "content",
    href: "/dashboard/content",
    labelKey: "dashboard.nav.content",
    children: [
      {
        id: "content-categories",
        href: "/dashboard/content-categories",
        labelKey: "dashboard.nav.contentCategories",
        adminOnly: true,
      },
    ],
  },
  {
    id: "webshop",
    href: "/dashboard/webshop",
    labelKey: "dashboard.nav.webshop",
    adminOnly: true,
    children: WEBSHOP_BACKEND_CHILD_LINKS,
  },
  {
    id: "license-server",
    href: "/dashboard/license-server",
    labelKey: "dashboard.nav.licenseServer",
    adminOnly: true,
    children: LICENSE_SERVER_BACKEND_CHILD_LINKS,
  },
  {
    id: "filemanager",
    href: "/dashboard/filemanager",
    labelKey: "dashboard.nav.fileManager",
    children: [
      {
        id: "gallerymanager",
        href: "/dashboard/gallerymanager",
        labelKey: "dashboard.nav.galleryManager",
      },
    ],
  },
  {
    id: "users",
    href: "/dashboard/users",
    labelKey: "dashboard.nav.users",
    adminOnly: true,
  },
  {
    id: "menus",
    href: "/dashboard/menus",
    labelKey: "dashboard.nav.menus",
    adminOnly: true,
  },
  {
    id: "form-builder",
    href: "/dashboard/form-builder",
    labelKey: "dashboard.nav.formBuilder",
    adminOnly: true,
  },
];

export function getBackendMenuTree({
  hasLicenseServerShell = false,
  isBackendUser,
  isAdmin,
  hasWebshopShell = false,
  t = defaultTranslate,
}: BackendMenuAccess): TopMenuTreeNode[] {
  if (!isBackendUser) return [];
  return BACKEND_MENU.map((item, order) =>
    toTopMenuNode(item, null, order, {
      hasLicenseServerShell,
      hasWebshopShell,
      isAdmin,
      t,
    }),
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
  access: {
    hasLicenseServerShell: boolean;
    hasWebshopShell: boolean;
    isAdmin: boolean;
    t: TranslateFn;
  },
): TopMenuTreeNode | null {
  if (item.id === "webshop" && !access.hasWebshopShell) return null;
  if (item.id === "license-server" && !access.hasLicenseServerShell) {
    return null;
  }
  if (item.adminOnly && !access.isAdmin) return null;

  const id = `backend:${item.id}`;
  return {
    id,
    label: access.t(item.labelKey),
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
