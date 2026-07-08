import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { I18nProvider, useI18n } from "@/components/i18n-provider";
import { getBackendMenuLinks, getBackendMenuTree } from "@/lib/backend-menu";
import { getContentStatusLabelKey } from "@/lib/content-status";
import {
  getContentTypeDescriptionKey,
  getContentTypeLabelKey,
} from "@/lib/content-types";
import { getActionErrorMessage } from "@/lib/i18n/dashboard-action-error";
import type { TranslationKey } from "@/lib/i18n/keys";
import { loadMessages } from "@/lib/i18n/load-messages";
import { en } from "@/lib/i18n/messages/en";
import { createTranslator } from "@/lib/i18n/translate";
import type { Messages } from "@/lib/i18n/types";
import { getRoleDescriptionKey, getRoleLabelKey } from "@/lib/roles";

test("translator falls back to English when a key is missing from active messages", () => {
  const t = createTranslator({} as Messages, en, "en");

  assert.equal(t("common.actions.save"), "Save");
});

test("translator returns the key for missing active and fallback messages", () => {
  const t = createTranslator({} as Messages, en, "en");

  assert.equal(t("missing.translation.key"), "missing.translation.key");
});

test("translator interpolates values", () => {
  const messages = {
    greeting: {
      hello: "Hello, {name}",
    },
  } as const satisfies Messages;
  const t = createTranslator(messages, en, "en");

  assert.equal(t("greeting.hello", { name: "Rade" }), "Hello, Rade");
});

test("translator selects plural branches", () => {
  const t = createTranslator(en, en, "en");

  assert.equal(t.plural("search.results", 1, { count: 1 }), "1 result");
  assert.equal(t.plural("search.results", 3, { count: 3 }), "3 results");
});

test("English dictionary loader returns source-of-truth English messages", async () => {
  const messages = await loadMessages("en");
  const t = createTranslator(messages, en, "en");

  assert.equal(t("globalSettings.tabs.general"), "General");
});

test("message loader falls back to English for unsupported languages", async () => {
  const messages = await loadMessages("xx-Unknown");
  const t = createTranslator(messages, en, "en");

  assert.equal(t("search.loading"), "Searching...");
});

test("I18nProvider exposes language, direction, and translators", () => {
  function Probe() {
    const { direction, language, t, tPlural } = useI18n();

    return createElement(
      "span",
      null,
      `${language}:${direction}:${t("common.actions.save")}:${tPlural(
        "search.results",
        2,
        { count: 2 },
      )}`,
    );
  }

  const html = renderToStaticMarkup(
    createElement(
      I18nProvider,
      { language: "ar", direction: "rtl", messages: en },
      createElement(Probe),
    ),
  );

  assert.match(html, /ar:rtl:Save:2 results/);
});

test("backend menu helper localizes CMS-owned shell labels", () => {
  const messages = {
    dashboard: {
      nav: {
        dashboard: "Kontrolna tabla",
        webshop: "Prodavnica",
        webshopOrders: "Porudzbine",
      },
    },
  } as Messages;
  const t = createTranslator(messages, en, "en");
  const tree = getBackendMenuTree({
    hasWebshopShell: true,
    isAdmin: true,
    isBackendUser: true,
    t,
  });
  const links = getBackendMenuLinks({
    hasWebshopShell: true,
    isAdmin: true,
    isBackendUser: true,
    t,
  });

  assert.equal(
    tree.find((item) => item.id === "backend:dashboard")?.label,
    "Kontrolna tabla",
  );
  assert.equal(
    tree.find((item) => item.id === "backend:webshop")?.label,
    "Prodavnica",
  );
  assert.deepEqual(
    links
      .filter((item) => item.id === "backend:webshop-orders")
      .map(({ href, label }) => ({ href, label })),
    [{ href: "/dashboard/webshop/orders", label: "Porudzbine" }],
  );
  assert.equal(
    links.find((item) => item.id === "backend:webshop-products")?.label,
    "Products",
  );
});

test("TranslationKey type accepts dictionary dot paths", () => {
  const key: TranslationKey = "globalSettings.tabs.general";

  assert.equal(key, "globalSettings.tabs.general");
});

test("dashboard enum label keys resolve through the English dictionary", () => {
  const t = createTranslator(en, en, "en");

  assert.equal(t(getContentStatusLabelKey("in_review")), "In review");
  assert.equal(t(getContentTypeLabelKey("blog_post")), "Blog post");
  assert.equal(
    t(getContentTypeDescriptionKey("hero_slider")),
    "Reusable visual hero slider.",
  );
  assert.equal(t(getRoleLabelKey("admin")), "Admin");
  assert.equal(t(getRoleDescriptionKey("admin")), "Full backend access");
});

test("dashboard action error helper preserves legacy strings and resolves coded errors", () => {
  const t = createTranslator(en, en, "en");

  assert.equal(getActionErrorMessage("Legacy error.", t), "Legacy error.");
  assert.equal(
    getActionErrorMessage(
      {
        code: "dashboard.content.errors.batchDeleteFailed",
        values: { count: 2 },
      },
      t,
    ),
    "2 item(s) could not be deleted.",
  );
  assert.equal(
    getActionErrorMessage(
      {
        code: "dashboard.content.errors.previewLinkFailed",
        message: "Preview service unavailable.",
      },
      t,
    ),
    "Preview service unavailable.",
  );
});
