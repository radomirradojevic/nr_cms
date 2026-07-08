import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  SUPPORTED_CMS_LANGUAGES,
  getCmsLanguageDirection,
  type CmsLanguage,
} from "@/lib/i18n/languages";
import { loadMessages } from "@/lib/i18n/load-messages";
import { MESSAGE_LOADERS } from "@/lib/i18n/messages";
import {
  ADDON_SHELL_SOURCE_STRINGS,
  ADDON_SHELL_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/addon-shell-translations";
import {
  CORE_UI_SOURCE_STRINGS,
  CORE_UI_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/core-ui-translations";
import { en } from "@/lib/i18n/messages/en";
import {
  LOCK_UI_SOURCE_STRINGS,
  LOCK_UI_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/lock-ui-translations";
import { localizeSourceString } from "@/lib/i18n/messages/localized";
import { createTranslator } from "@/lib/i18n/translate";
import type {
  Messages,
  PluralCategory,
  PluralMessages,
} from "@/lib/i18n/types";

const PLURAL_CATEGORIES = new Set<string>([
  "zero",
  "one",
  "two",
  "few",
  "many",
  "other",
]);

const ARABIC_PLURAL_CATEGORIES = ["few", "many", "one", "other", "two", "zero"];

const SLAVIC_PLURAL_CATEGORIES = ["few", "many", "one", "other"];

const SLAVIC_LANGUAGES = new Set<CmsLanguage>([
  "sr-Latn",
  "sr-Cyrl",
  "hr",
  "pl",
  "mk",
  "bs",
  "sl",
  "ru",
  "bg",
  "cs",
]);

type LocalizedLanguage = Exclude<CmsLanguage, "en">;

const FALLBACK_MARKER_PATTERN =
  /\[(?:Deutsch|srpski|српски|hrvatski|français|español|italiano|português|português BR|Nederlands|polski|Türkçe|македонски|bosanski|slovenščina|русский|magyar|български|日本語|简体中文|繁體中文|العربية|Indonesia|česky|română|ελληνικά|dansk|svenska|bokmål|nynorsk|suomi|íslenska)\]/u;

const CORE_UI_MESSAGE_PREFIXES = ["common.", "shell.", "search."] as const;
const ADDON_SHELL_MESSAGE_PREFIXES = ["addons."] as const;

const VISIBLE_DASHBOARD_ROOT_KEYS = [
  "dashboard.accessUnavailable.title",
  "dashboard.accessUnavailable.description",
  "dashboard.nav.globalSettings",
  "dashboard.nav.content",
  "dashboard.nav.fileManager",
  "dashboard.nav.galleryManager",
  "dashboard.nav.users",
  "dashboard.nav.menus",
  "dashboard.nav.formBuilder",
  "dashboard.landing.noDataYet",
  "dashboard.landing.cards.globalSettings.description",
  "dashboard.landing.cards.globalSettings.action",
  "dashboard.landing.cards.content.description",
  "dashboard.landing.cards.content.action",
  "dashboard.landing.cards.files.description",
  "dashboard.landing.cards.files.action",
  "dashboard.landing.cards.galleries.description",
  "dashboard.landing.cards.galleries.action",
  "dashboard.landing.cards.users.description",
  "dashboard.landing.cards.users.action",
  "dashboard.landing.cards.categories.title",
  "dashboard.landing.cards.categories.description",
  "dashboard.landing.cards.categories.action",
  "dashboard.landing.cards.menus.description",
  "dashboard.landing.cards.menus.action",
  "dashboard.landing.cards.forms.description",
  "dashboard.landing.cards.forms.action",
  "dashboard.landing.stats.admins",
  "dashboard.landing.stats.authors",
  "dashboard.landing.stats.batchUploadMb",
  "dashboard.landing.stats.blogCategories",
  "dashboard.landing.stats.documents",
  "dashboard.landing.stats.heroSliders",
  "dashboard.landing.stats.idleLogoutMin",
  "dashboard.landing.stats.images",
  "dashboard.landing.stats.maxUploadMb",
  "dashboard.landing.stats.nestedItems",
  "dashboard.landing.stats.pageCategories",
  "dashboard.landing.stats.publishers",
  "dashboard.landing.stats.sessionLimitMin",
  "dashboard.landing.stats.totalBlogPosts",
  "dashboard.landing.stats.totalCategories",
  "dashboard.landing.stats.totalFiles",
  "dashboard.landing.stats.totalForms",
  "dashboard.landing.stats.totalGalleries",
  "dashboard.landing.stats.totalImages",
  "dashboard.landing.stats.totalItems",
  "dashboard.landing.stats.totalMenus",
  "dashboard.landing.stats.totalPages",
  "dashboard.landing.stats.totalSubmissions",
  "dashboard.landing.stats.totalUsers",
  "dashboard.landing.stats.videos",
  "dashboard.landing.stats.webshops",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPluralMessages(value: unknown): value is PluralMessages {
  if (!isRecord(value)) return false;
  const entries = Object.entries(value);

  return (
    entries.length > 0 &&
    entries.every(
      ([key, message]) =>
        PLURAL_CATEGORIES.has(key) && typeof message === "string",
    )
  );
}

function placeholderSet(message: string): string[] {
  return Array.from(message.matchAll(/\{([a-zA-Z0-9_]+)\}/g))
    .map((match) => match[1])
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort();
}

function keyPath(pathSegments: readonly string[]) {
  return pathSegments.join(".");
}

function collectMessageLeafPaths(
  node: unknown,
  pathSegments: string[] = [],
): string[] {
  if (typeof node === "string" || isPluralMessages(node)) {
    return [keyPath(pathSegments)];
  }

  if (!isRecord(node)) return [];

  return Object.entries(node).flatMap(([key, value]) =>
    collectMessageLeafPaths(value, [...pathSegments, key]),
  );
}

function getMessageLeaf(messages: Messages, key: string): unknown {
  let current: unknown = messages;

  for (const segment of key.split(".")) {
    if (!isRecord(current) || !(segment in current)) return undefined;
    current = current[segment];
  }

  return current;
}

function collectStringLeaves(node: unknown): string[] {
  if (typeof node === "string") return [node];
  if (isPluralMessages(node)) return Object.values(node);
  if (!isRecord(node)) return [];

  return Object.values(node).flatMap(collectStringLeaves);
}

function sampleValuesForKey(key: string): Record<string, string | number> {
  if (key === "shell.collapseSubmenu" || key === "shell.expandSubmenu") {
    return { label: "Content" };
  }

  if (key === "search.resultsFor") {
    return { query: "cms", results: "2" };
  }

  if (key === "addons.common.supportedInstallTargets") {
    return { providers: "npm, Git" };
  }

  return {};
}

function renderTemplate(
  template: string,
  values: Record<string, string | number> = {},
) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

function assertPlaceholderParity(
  englishMessage: string,
  translatedMessage: string,
  pathSegments: readonly string[],
  language: CmsLanguage,
) {
  assert.deepEqual(
    placeholderSet(translatedMessage),
    placeholderSet(englishMessage),
    `${language}:${keyPath(pathSegments)} placeholders differ`,
  );
}

function assertDictionaryShape(
  englishNode: unknown,
  translatedNode: unknown,
  language: CmsLanguage,
  pathSegments: string[] = [],
) {
  if (typeof englishNode === "string") {
    assert.equal(
      typeof translatedNode,
      "string",
      `${language}:${keyPath(pathSegments)} must be a string leaf`,
    );
    assertPlaceholderParity(
      englishNode,
      translatedNode as string,
      pathSegments,
      language,
    );
    return;
  }

  if (isPluralMessages(englishNode)) {
    assert.equal(
      isPluralMessages(translatedNode),
      true,
      `${language}:${keyPath(pathSegments)} must be a plural leaf`,
    );

    const translatedPlural = translatedNode as PluralMessages;
    assert.equal(
      typeof translatedPlural.other,
      "string",
      `${language}:${keyPath(pathSegments)} must include an other plural branch`,
    );

    for (const [category, englishMessage] of Object.entries(englishNode) as [
      PluralCategory,
      string,
    ][]) {
      assert.equal(
        typeof translatedPlural[category],
        "string",
        `${language}:${keyPath(pathSegments)} missing ${category} plural branch`,
      );
      assertPlaceholderParity(
        englishMessage,
        translatedPlural[category] ?? "",
        [...pathSegments, category],
        language,
      );
    }

    for (const [category, translatedMessage] of Object.entries(
      translatedPlural,
    ) as [PluralCategory, string][]) {
      assert.equal(
        PLURAL_CATEGORIES.has(category),
        true,
        `${language}:${keyPath(pathSegments)} has invalid plural category ${category}`,
      );
      const englishMessage = englishNode[category] ?? englishNode.other ?? "";
      assertPlaceholderParity(
        englishMessage,
        translatedMessage,
        [...pathSegments, category],
        language,
      );
    }

    if (language === "ar") {
      assert.deepEqual(
        Object.keys(translatedPlural).sort(),
        ARABIC_PLURAL_CATEGORIES,
        `${language}:${keyPath(pathSegments)} should expose Arabic plural categories`,
      );
    } else if (SLAVIC_LANGUAGES.has(language)) {
      assert.deepEqual(
        Object.keys(translatedPlural).sort(),
        SLAVIC_PLURAL_CATEGORIES,
        `${language}:${keyPath(pathSegments)} should expose Slavic plural categories`,
      );
    }

    return;
  }

  assert.equal(
    isRecord(englishNode),
    true,
    `${language}:${keyPath(pathSegments)} English node must be an object`,
  );
  assert.equal(
    isRecord(translatedNode),
    true,
    `${language}:${keyPath(pathSegments)} translated node must be an object`,
  );
  assert.equal(
    Array.isArray(translatedNode),
    false,
    `${language}:${keyPath(pathSegments)} translated dictionaries cannot use arrays`,
  );

  const englishKeys = Object.keys(
    englishNode as Record<string, unknown>,
  ).sort();
  const translatedKeys = Object.keys(
    translatedNode as Record<string, unknown>,
  ).sort();

  assert.deepEqual(
    translatedKeys,
    englishKeys,
    `${language}:${keyPath(pathSegments)} object keys must match English`,
  );

  for (const key of englishKeys) {
    assertDictionaryShape(
      (englishNode as Record<string, unknown>)[key],
      (translatedNode as Record<string, unknown>)[key],
      language,
      [...pathSegments, key],
    );
  }
}

function sourceFiles(root: string): string[] {
  const absoluteRoot = path.join(process.cwd(), root);
  const entries = readdirSync(absoluteRoot);
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(absoluteRoot, entry);
    const relativePath = path.relative(process.cwd(), absolutePath);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      if (
        relativePath === path.join("lib", "i18n", "messages") ||
        entry === "node_modules" ||
        entry === ".next"
      ) {
        continue;
      }
      files.push(...sourceFiles(relativePath));
      continue;
    }

    if (stats.isFile() && /\.(ts|tsx)$/.test(entry)) {
      files.push(relativePath);
    }
  }

  return files;
}

function directTranslationKeys(): string[] {
  const keys = new Set<string>();
  const directCallPattern = /\b([A-Za-z_$][\w$]*)\(\s*["'`]([^"'`]+)["'`]/g;
  const pluralCallPattern =
    /\b([A-Za-z_$][\w$]*)\.plural\(\s*["'`]([^"'`]+)["'`]/g;
  const sourceTranslatorPattern =
    /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*useSourceTranslations\(\)/g;

  for (const file of ["app", "components", "lib"].flatMap(sourceFiles)) {
    const source = readFileSync(path.join(process.cwd(), file), "utf8");
    const sourceTranslators = new Set(
      Array.from(source.matchAll(sourceTranslatorPattern), (match) => match[1]),
    );

    for (const match of source.matchAll(directCallPattern)) {
      const [, callee, key] = match;
      if (callee !== "t" && callee !== "tPlural") continue;
      if (sourceTranslators.has(callee)) continue;
      if (key.includes("${")) continue;
      keys.add(key);
    }

    for (const match of source.matchAll(pluralCallPattern)) {
      const [, callee, key] = match;
      if (sourceTranslators.has(callee)) continue;
      if (key.includes("${")) continue;
      keys.add(key);
    }
  }

  return Array.from(keys).sort();
}

test("supported CMS languages have message loaders", () => {
  assert.deepEqual(
    Object.keys(MESSAGE_LOADERS).sort(),
    SUPPORTED_CMS_LANGUAGES.map((language) => language.code).sort(),
  );
});

test("every dictionary matches the English key shape and placeholders", async () => {
  for (const language of SUPPORTED_CMS_LANGUAGES) {
    const messages = await loadMessages(language.code);
    assertDictionaryShape(en, messages, language.code);
  }
});

test("every language can create translators and return representative values", async () => {
  for (const language of SUPPORTED_CMS_LANGUAGES) {
    const messages = await loadMessages(language.code);
    const t = createTranslator(messages, en, language.code);

    for (const key of [
      "common.actions.save",
      "dashboard.nav.dashboard",
      "globalSettings.tabs.general",
      "search.loading",
    ]) {
      assert.notEqual(t(key), "", `${language.code}:${key}`);
    }

    assert.notEqual(
      t.plural("search.results", 2, { count: 2 }),
      "",
      `${language.code}:search.results plural`,
    );
  }
});

test("localized dictionaries do not expose marker fallback strings", async () => {
  for (const language of SUPPORTED_CMS_LANGUAGES) {
    const messages = await loadMessages(language.code);
    const markerValues = collectStringLeaves(messages).filter((value) =>
      FALLBACK_MARKER_PATTERN.test(value),
    );

    assert.deepEqual(markerValues, [], `${language.code} marker fallbacks`);
  }
});

test("core UI chrome labels localize across supported languages", async () => {
  const coreUiSources = new Set<string>(CORE_UI_SOURCE_STRINGS);
  const coreUiKeys = collectMessageLeafPaths(en).filter((key) =>
    CORE_UI_MESSAGE_PREFIXES.some((prefix) => key.startsWith(prefix)),
  );

  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;

    const localizedCode = code as LocalizedLanguage;
    const translations: Record<string, string> =
      CORE_UI_SOURCE_TRANSLATIONS[localizedCode];
    const t = createTranslator(
      await loadMessages(localizedCode),
      en,
      localizedCode,
    );

    for (const source of CORE_UI_SOURCE_STRINGS) {
      assert.equal(
        localizeSourceString(source, localizedCode),
        translations[source],
        `${localizedCode}:${source}`,
      );
    }

    for (const key of coreUiKeys) {
      const englishLeaf = getMessageLeaf(en, key);

      if (typeof englishLeaf === "string") {
        assert.equal(
          coreUiSources.has(englishLeaf),
          true,
          `core UI source missing for ${key}: ${englishLeaf}`,
        );

        const values = sampleValuesForKey(key);
        assert.equal(
          t(key, values),
          renderTemplate(translations[englishLeaf], values),
          `${localizedCode}:${key}`,
        );
        continue;
      }

      assert.equal(
        isPluralMessages(englishLeaf),
        true,
        `${key} should be a string or plural leaf`,
      );

      const englishPlural = englishLeaf as PluralMessages;
      const singularSource = englishPlural.one ?? englishPlural.other ?? "";
      const pluralSource = englishPlural.other ?? englishPlural.one ?? "";

      assert.equal(
        coreUiSources.has(singularSource),
        true,
        `core UI plural source missing for ${key}: ${singularSource}`,
      );
      assert.equal(
        coreUiSources.has(pluralSource),
        true,
        `core UI plural source missing for ${key}: ${pluralSource}`,
      );

      assert.equal(
        t.plural(key, 1, { count: 1 }),
        renderTemplate(translations[singularSource], { count: 1 }),
        `${localizedCode}:${key}:one`,
      );
      assert.equal(
        t.plural(key, 2, { count: 2 }),
        renderTemplate(translations[pluralSource], { count: 2 }),
        `${localizedCode}:${key}:other`,
      );
    }
  }
});

test("paid addon shell labels localize across supported backend languages", async () => {
  const addonShellSources = new Set<string>(ADDON_SHELL_SOURCE_STRINGS);
  const addonShellKeys = collectMessageLeafPaths(en).filter((key) =>
    ADDON_SHELL_MESSAGE_PREFIXES.some((prefix) => key.startsWith(prefix)),
  );

  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;

    const localizedCode = code as LocalizedLanguage;
    const translations: Record<string, string> =
      ADDON_SHELL_SOURCE_TRANSLATIONS[localizedCode];
    const t = createTranslator(
      await loadMessages(localizedCode),
      en,
      localizedCode,
    );

    for (const source of ADDON_SHELL_SOURCE_STRINGS) {
      assert.equal(
        localizeSourceString(source, localizedCode),
        translations[source],
        `${localizedCode}:${source}`,
      );
    }

    for (const key of addonShellKeys) {
      const englishLeaf = getMessageLeaf(en, key);

      assert.equal(typeof englishLeaf, "string", `${key} must be a string`);
      assert.equal(
        addonShellSources.has(englishLeaf as string),
        true,
        `addon shell source missing for ${key}: ${englishLeaf}`,
      );

      const values = sampleValuesForKey(key);
      assert.equal(
        t(key, values),
        renderTemplate(translations[englishLeaf as string], values),
        `${localizedCode}:${key}`,
      );
    }
  }
});

test("edit lock UI labels localize across supported backend languages", () => {
  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;

    const localizedCode = code as LocalizedLanguage;
    const translations: Record<string, string> =
      LOCK_UI_SOURCE_TRANSLATIONS[localizedCode];

    for (const source of LOCK_UI_SOURCE_STRINGS) {
      assert.equal(
        localizeSourceString(source, localizedCode),
        translations[source],
        `${localizedCode}:${source}`,
      );
      assert.notEqual(
        translations[source],
        source,
        `${localizedCode}:${source}`,
      );
    }
  }
});

test("webshop source strings localize across supported frontend languages", () => {
  const sourceStrings = [
    "Store",
    "Search products",
    "Order history",
    "Wishlist",
    "Cart",
    "Search, filter, and open your webshop orders.",
    "No orders yet",
    "Orders you place while signed in will appear here.",
    "No orders match these filters",
  ];

  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;
    for (const source of sourceStrings) {
      assert.notEqual(
        localizeSourceString(source, code),
        source,
        `${code}:${source}`,
      );
    }
  }
});

test("comments moderation labels localize across supported backend languages", async () => {
  const english = createTranslator(en, en, "en");
  const keys = [
    "dashboard.content.commentsModeration.backToPost",
    "dashboard.content.commentsModeration.title",
    "dashboard.content.commentsModeration.pendingCount",
    "dashboard.content.commentsModeration.table.empty",
    "dashboard.content.commentsModeration.actions.publish",
    "dashboard.content.commentsModeration.actions.unpublish",
    "dashboard.content.commentsModeration.dialogs.deleteTitle",
    "dashboard.content.commentsModeration.dialogs.deleteDescription",
  ];

  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;
    const t = createTranslator(await loadMessages(code), en, code);

    for (const key of keys) {
      const values = { count: 3 };
      assert.notEqual(t(key, values), english(key, values), `${code}:${key}`);
    }
  }
});

test("visible dashboard root labels localize across supported backend languages", async () => {
  const english = createTranslator(en, en, "en");
  const fallbackMatches: string[] = [];

  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;

    const t = createTranslator(await loadMessages(code), en, code);

    for (const key of VISIBLE_DASHBOARD_ROOT_KEYS) {
      if (t(key) === english(key)) {
        fallbackMatches.push(`${code}:${key}`);
      }
    }
  }

  assert.deepEqual(fallbackMatches, []);
});

test("German dictionary covers visible global settings and webshop checkout labels", async () => {
  const de = createTranslator(await loadMessages("de"), en, "de");

  assert.equal(
    de("globalSettings.regionalSettings.title"),
    "Regionale Einstellungen",
  );
  assert.equal(de("globalSettings.siteIdentity.title"), "Website-Identität");
  assert.equal(localizeSourceString("Order history", "de"), "Bestellverlauf");
  assert.equal(
    localizeSourceString("Your cart is empty.", "de"),
    "Dein Warenkorb ist leer.",
  );
  assert.equal(de("dashboard.contentCategories.tabs.page"), "Seitenkategorien");
  assert.equal(
    de("dashboard.contentCategories.dialogs.deleteTitle"),
    "Kategorie löschen?",
  );
});

test("direct literal translation keys used in source exist in English", () => {
  const missing = directTranslationKeys().filter((key) => {
    const value = getMessageLeaf(en, key);
    return typeof value !== "string" && !isPluralMessages(value);
  });

  assert.deepEqual(missing, []);
});

test("language-specific dictionary smoke checks cover scripts and distinct loaders", async () => {
  const srLatn = createTranslator(await loadMessages("sr-Latn"), en, "sr-Latn");
  const srCyrl = createTranslator(await loadMessages("sr-Cyrl"), en, "sr-Cyrl");
  const zhHans = createTranslator(await loadMessages("zh-Hans"), en, "zh-Hans");
  const zhHant = createTranslator(await loadMessages("zh-Hant"), en, "zh-Hant");

  assert.equal(/[\u0400-\u04ff]/u.test(srLatn("common.actions.save")), false);
  assert.match(srCyrl("dashboard.nav.dashboard"), /[\u0400-\u04ff]/u);
  assert.equal(getCmsLanguageDirection("ar"), "rtl");
  assert.notEqual(
    zhHans("globalSettings.tabs.general"),
    zhHant("globalSettings.tabs.general"),
  );
});
