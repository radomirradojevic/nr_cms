import assert from "node:assert/strict";
import test from "node:test";

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
