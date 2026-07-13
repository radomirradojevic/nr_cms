import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  getInlineEndToastPosition,
  getLogicalBackIconName,
} from "@/lib/i18n/direction";
import { getCmsLanguageDirection } from "@/lib/i18n/languages";

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("direction helpers resolve Arabic as RTL and choose logical UI affordances", () => {
  assert.equal(getCmsLanguageDirection("ar"), "rtl");
  assert.equal(getLogicalBackIconName("ltr"), "ArrowLeft");
  assert.equal(getLogicalBackIconName("rtl"), "ArrowRight");
  assert.equal(getInlineEndToastPosition("ltr"), "bottom-right");
  assert.equal(getInlineEndToastPosition("rtl"), "bottom-left");
});

test("root and dashboard layouts keep frontend/backend directions isolated", () => {
  assert.match(source("app/layout.tsx"), /dir=\{frontendDirection\}/);

  const dashboardLayout = source("app/dashboard/layout.tsx");
  assert.match(dashboardLayout, /dir=\{backendDirection\}/);
  assert.match(
    dashboardLayout,
    /getInlineEndToastPosition\(backendDirection\)/,
  );
});

test("critical RTL shell fixes use logical positioning and indentation", () => {
  const mobileMenu = source("components/site-top-menu-mobile.tsx");
  assert.doesNotMatch(mobileMenu, /fixed right-3/);
  assert.doesNotMatch(mobileMenu, /origin-top-right/);
  assert.doesNotMatch(mobileMenu, /ml-4 border-l border-border pl-3/);
  assert.doesNotMatch(mobileMenu, /↳/);
  assert.match(mobileMenu, /fixed end-3/);
  assert.match(mobileMenu, /origin-top-end/);
  assert.match(mobileMenu, /ms-4 border-s border-border ps-3/);

  const siteSearch = source("components/site-search.tsx");
  assert.doesNotMatch(siteSearch, /right-0"\s*:\s*"left-0/);
  assert.doesNotMatch(siteSearch, /absolute right-0/);
  assert.match(siteSearch, /end-0/);
  assert.match(siteSearch, /start-0/);

  const adminLauncher = source("components/site-admin-menu.tsx");
  assert.doesNotMatch(adminLauncher, /fixed left-\[/);
  assert.match(adminLauncher, /fixed start-\[/);
});

test("critical dashboard floating actions use inline end", () => {
  assert.doesNotMatch(
    source("app/dashboard/global-settings/settings-form.tsx"),
    /fixed right-4 bottom/,
  );
  assert.doesNotMatch(
    source("app/dashboard/content/content-form.tsx"),
    /fixed right-4 bottom/,
  );
});

test("global CSS exposes logical origin and inline icon mirroring helpers", () => {
  const css = source("app/globals.css");
  assert.match(css, /\.origin-top-end/);
  assert.match(css, /\[data-icon="inline-start"\]/);
  assert.match(css, /\[data-icon="inline-end"\]/);
});
