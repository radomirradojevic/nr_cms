import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { HeroSliderRenderer } from "@/components/hero-slider-renderer";
import type { TopMenuTreeNode } from "@/data/top-menu";
import { getBackendMenuLinks, getBackendMenuTree } from "@/lib/backend-menu";
import {
  HERO_SLIDE_BLOCK_OPTIONS,
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
  });
  assert.ok(adminLinks.some((item) => item.id === "backend:global-settings"));
  assert.ok(adminLinks.some((item) => item.id === "backend:form-builder"));
  assert.deepEqual(
    adminLinks
      .filter((item) => item.isChild)
      .map((item) => item.id)
      .slice(0, 3),
    [
      "backend:global-settings",
      "backend:content-categories",
      "backend:gallerymanager",
    ],
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
