import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { HeroSliderRenderer } from "@/components/hero-slider-renderer";
import type { TopMenuTreeNode } from "@/data/top-menu";
import { getBackendMenuLinks, getBackendMenuTree } from "@/lib/backend-menu";
import {
  HERO_SLIDE_BLOCK_OPTIONS,
  collectHeroSliderFileIds,
  collectHeroSliderMenuIds,
  normalizeHeroSliderContent,
} from "@/lib/hero-slider";

test("hero slider menu blocks are normalized and collected deeply", () => {
  const primaryMenuId = "menu-primary";
  const footerMenuId = "menu-footer";

  const data = normalizeHeroSliderContent({
    version: 1,
    settings: {},
    slides: [
      {
        id: "slide",
        name: "Slide",
        image: {},
        video: {},
        layout: {},
        layers: {},
        responsive: {},
        blocks: [
          {
            id: "menu-root",
            type: "menu",
            props: { menuId: primaryMenuId, menuName: "Primary" },
          },
          {
            id: "container",
            type: "container",
            props: {},
            children: [
              {
                id: "menu-nested",
                type: "menu",
                props: { menuId: footerMenuId, menuName: "Footer" },
              },
            ],
          },
          {
            id: "columns",
            type: "columns",
            props: {},
            columns: [
              [
                {
                  id: "menu-duplicate",
                  type: "menu",
                  props: { menuId: primaryMenuId, menuName: "Primary again" },
                },
              ],
            ],
          },
        ],
      },
    ],
  });

  assert.equal(
    HERO_SLIDE_BLOCK_OPTIONS.some((option) => option.value === "menu"),
    false,
  );
  assert.equal(data.slides[0]?.blocks.length, 2);
  assert.equal(data.slides[0]?.menus.length, 3);
  assert.deepEqual(
    data.slides[0]?.menus.map((menu) => menu.id),
    ["menu-root", "menu-nested", "menu-duplicate"],
  );
  assert.deepEqual(collectHeroSliderMenuIds(data), [
    primaryMenuId,
    footerMenuId,
  ]);
});

test("hero slider file ids are collected from slide media and image blocks", () => {
  const backgroundId = "11111111-1111-4111-8111-111111111111";
  const tabletId = "22222222-2222-4222-8222-222222222222";
  const videoId = "33333333-3333-4333-8333-333333333333";
  const posterId = "44444444-4444-4444-8444-444444444444";
  const blockId = "55555555-5555-4555-8555-555555555555";
  const nestedId = "66666666-6666-4666-8666-666666666666";
  const ignoredHrefId = "77777777-7777-4777-8777-777777777777";

  assert.deepEqual(
    collectHeroSliderFileIds({
      version: 1,
      settings: {},
      slides: [
        {
          id: "slide",
          name: "Slide",
          image: {
            src: `/api/files/${backgroundId}`,
            tabletSrc: `https://cms.test/api/files/${tabletId}?variant=wide`,
          },
          video: {
            src: `/api/files/${videoId}#t=0`,
            poster: `/api/files/${posterId}`,
          },
          layout: {},
          layers: {},
          responsive: {},
          blocks: [
            {
              id: "image",
              type: "image",
              props: { src: `/api/files/${blockId}` },
            },
            {
              id: "container",
              type: "container",
              props: {},
              children: [
                {
                  id: "nested-image",
                  type: "image",
                  props: { src: `/api/files/${nestedId}` },
                },
              ],
            },
            {
              id: "button",
              type: "button",
              props: { href: `/api/files/${ignoredHrefId}` },
            },
          ],
        },
      ],
    }),
    [backgroundId, tabletId, videoId, posterId, blockId, nestedId],
  );
});

test("hero slider menu presets upgrade legacy preset defaults", () => {
  const data = normalizeHeroSliderContent({
    version: 1,
    settings: {},
    slides: [
      {
        id: "slide",
        name: "Slide",
        image: {},
        video: {},
        layout: {},
        layers: {},
        responsive: {},
        blocks: [
          {
            id: "menu",
            type: "menu",
            props: {
              preset: "solid",
              backgroundColor: "#ffffff",
              borderRadius: "0.75rem",
              shadow: "0 16px 35px rgba(15,23,42,0.16)",
            },
          },
        ],
      },
    ],
  });

  const menuProps = data.slides[0]?.menus[0]?.props ?? {};
  assert.equal(menuProps.backgroundColor, "transparent");
  assert.equal(menuProps.borderRadius, "0.5rem");
  assert.equal(menuProps.submenuRadius, "0.5rem");
  assert.equal(menuProps.positionMode, "absolute");
  assert.equal(menuProps.anchor, "top-right");
  assert.equal(menuProps.appendBackendMenu, false);
  assert.equal(menuProps.appendAuthMenu, false);
});

test("hero slider menu wrapper spacing is normalized", () => {
  const data = normalizeHeroSliderContent({
    version: 1,
    settings: {},
    slides: [
      {
        id: "slide",
        name: "Slide",
        image: {},
        video: {},
        layout: {},
        layers: {},
        responsive: {},
        menus: [
          {
            id: "menu",
            props: {
              wrapperMargin: { top: "24px", right: "1rem" },
              wrapperPadding: { bottom: "8px", left: "2vw" },
            },
          },
        ],
        blocks: [],
      },
    ],
  });

  const menuProps = data.slides[0]?.menus[0]?.props ?? {};
  assert.deepEqual(menuProps.wrapperMargin, {
    top: "24px",
    right: "1rem",
    bottom: "",
    left: "",
  });
  assert.deepEqual(menuProps.wrapperPadding, {
    top: "",
    right: "",
    bottom: "8px",
    left: "2vw",
  });
});

test("hero slider menu append flags are normalized as booleans", () => {
  const data = normalizeHeroSliderContent({
    version: 1,
    settings: {},
    slides: [
      {
        id: "slide",
        name: "Slide",
        image: {},
        video: {},
        layout: {},
        layers: {},
        responsive: {},
        menus: [
          {
            id: "menu",
            props: {
              appendBackendMenu: true,
              appendAuthMenu: "true",
            },
          },
        ],
        blocks: [],
      },
    ],
  });

  const menuProps = data.slides[0]?.menus[0]?.props ?? {};
  assert.equal(menuProps.appendBackendMenu, true);
  assert.equal(menuProps.appendAuthMenu, false);
});

test("hero slider search inputs are normalized independently from blocks and menus", () => {
  const data = normalizeHeroSliderContent({
    version: 1,
    settings: {},
    slides: [
      {
        id: "slide",
        name: "Slide",
        image: {},
        video: {},
        layout: {},
        layers: {},
        responsive: {},
        searchInputs: [
          {
            id: "search",
            props: {
              preset: "solid",
              label: "Find content",
              placeholder: "Search the site",
              contentTypes: ["page", "bad"],
              anchor: "center",
              wrapperMargin: { top: "12px" },
              resultsAlign: "right",
            },
            hiddenOn: ["mobile"],
          },
        ],
        menus: [],
        blocks: [],
      },
    ],
  });

  const slide = data.slides[0];
  const searchInput = slide?.searchInputs[0];
  const props = searchInput?.props ?? {};
  assert.equal(slide?.blocks.length, 0);
  assert.equal(slide?.menus.length, 0);
  assert.equal(slide?.searchInputs.length, 1);
  assert.equal(searchInput?.id, "search");
  assert.deepEqual(searchInput?.hiddenOn, ["mobile"]);
  assert.equal(props.positionMode, "absolute");
  assert.equal(props.anchor, "center");
  assert.equal(props.backgroundColor, "var(--background)");
  assert.deepEqual(props.contentTypes, ["page"]);
  assert.deepEqual(props.wrapperMargin, {
    top: "12px",
    right: "",
    bottom: "",
    left: "",
  });
  assert.equal(props.resultsAlign, "right");
});

test("hero slider search inputs render the shared site search form", () => {
  const html = renderToStaticMarkup(
    createElement(HeroSliderRenderer, {
      data: {
        version: 1,
        settings: {},
        slides: [
          {
            id: "slide",
            name: "Slide",
            image: {},
            video: {},
            layout: {},
            layers: {},
            responsive: {},
            blocks: [],
            menus: [],
            searchInputs: [
              {
                id: "hero-search",
                props: {
                  label: "Hero search",
                  placeholder: "Find stories",
                  contentTypes: ["blog_post"],
                  anchor: "bottom-center",
                },
              },
            ],
          },
        ],
      },
    }),
  );

  assert.match(html, /hero-slider-search-input/);
  assert.match(html, /role="search"/);
  assert.match(html, /aria-label="Hero search"/);
  assert.match(html, /placeholder="Find stories"/);
  assert.match(html, /name="types" value="blog_post"/);
});

test("backend menu helper exposes stable role-aware targets", () => {
  assert.deepEqual(
    getBackendMenuTree({ isBackendUser: false, isAdmin: true }),
    [],
  );

  const authorTree = getBackendMenuTree({
    isBackendUser: true,
    isAdmin: false,
  });
  assert.deepEqual(
    authorTree.map((item) => item.id),
    ["backend:dashboard", "backend:content", "backend:filemanager"],
  );
  assert.deepEqual(authorTree[0]?.children, []);
  assert.deepEqual(
    authorTree[2]?.children.map((item) => item.id),
    ["backend:gallerymanager"],
  );

  const adminLinks = getBackendMenuLinks({
    isBackendUser: true,
    isAdmin: true,
    hasWebshopShell: true,
  });
  assert.ok(adminLinks.some((item) => item.id === "backend:global-settings"));
  assert.ok(adminLinks.some((item) => item.id === "backend:webshop"));
  assert.ok(adminLinks.some((item) => item.id === "backend:webshop-orders"));
  assert.ok(adminLinks.some((item) => item.id === "backend:form-builder"));
  assert.equal(
    getBackendMenuLinks({
      isBackendUser: true,
      isAdmin: true,
      hasWebshopShell: false,
    }).some((item) => item.id === "backend:webshop"),
    false,
  );
  assert.equal(
    getBackendMenuLinks({
      isBackendUser: true,
      isAdmin: true,
    }).some((item) => item.id === "backend:webshop"),
    false,
  );
  assert.deepEqual(
    adminLinks
      .filter((item) => item.isChild)
      .map((item) => item.id)
      .slice(0, 9),
    [
      "backend:global-settings",
      "backend:content-categories",
      "backend:webshop-categories",
      "backend:webshop-orders",
      "backend:webshop-wishlist",
      "backend:webshop-settings",
      "backend:webshop-products",
      "backend:webshop-promotions",
      "backend:webshop-storefront",
    ],
  );
  assert.deepEqual(
    adminLinks
      .filter((item) => item.id.startsWith("backend:webshop-"))
      .map(({ href, label }) => ({ href, label })),
    [
      { href: "/dashboard/webshop/categories", label: "Categories" },
      { href: "/dashboard/webshop/orders", label: "Orders" },
      { href: "/dashboard/webshop/wishlists", label: "Wishlist" },
      { href: "/dashboard/webshop/settings", label: "Settings" },
      { href: "/dashboard/webshop/products", label: "Products" },
      { href: "/dashboard/webshop/promotions", label: "Promotions" },
      { href: "/dashboard/webshop/storefront", label: "Storefront" },
    ],
  );
  assert.deepEqual(
    adminLinks
      .filter((item) => item.isChild)
      .map((item) => item.id)
      .slice(9, 10),
    ["backend:gallerymanager"],
  );
});

test("top-right anchored hero slider menus open nested submenus toward the viewport", () => {
  const menuTree: TopMenuTreeNode[] = [
    {
      id: "home",
      label: "Home",
      url: "/home",
      parentId: null,
      order: 0,
      contentId: null,
      categoryId: null,
      target: "_self",
      children: [
        {
          id: "publisher",
          label: "Publisher",
          url: "/publisher",
          parentId: "home",
          order: 0,
          contentId: null,
          categoryId: null,
          target: "_self",
          children: [
            {
              id: "post",
              label: "Post",
              url: "/publisher/post",
              parentId: "publisher",
              order: 0,
              contentId: null,
              categoryId: null,
              target: "_self",
              children: [],
            },
          ],
        },
      ],
    },
  ];

  const html = renderToStaticMarkup(
    createElement(HeroSliderRenderer, {
      data: {
        version: 1,
        settings: {},
        slides: [
          {
            id: "slide",
            name: "Slide",
            image: {},
            video: {},
            layout: {},
            layers: {},
            responsive: {},
            blocks: [],
            menus: [
              {
                id: "menu-top-right",
                props: {
                  menuId: "primary",
                  menuName: "Primary",
                  anchor: "top-right",
                  layout: "horizontal",
                },
              },
            ],
          },
        ],
      },
      initialMenuTrees: { primary: menuTree },
    }),
  );

  assert.match(html, /data-submenu-side="left"/);
  assert.match(
    html,
    /\.hero-menu-menu-top-right\[data-submenu-side="left"\]\.hero-menu-layout-horizontal[^{]*\{[\s\S]*?right: 0;/,
  );
  assert.match(
    html,
    /\.hero-menu-menu-top-right\[data-submenu-side="left"\] \.hero-menu-submenu \.hero-menu-submenu\s*\{[\s\S]*?right: 100%;/,
  );
});
