import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BlogCategoryTemplate } from "@/components/blog-category-template";
import { BlogPostTemplate } from "@/components/blog-post-template";
import { PageTemplate } from "@/components/page-template";
import { SiteFooter } from "@/components/site-footer";
import { SiteMain } from "@/components/site-main";
import {
  DEFAULT_APPEARANCE,
  THEMES,
  getContentWidthValue,
  normalizeContentWidth,
  parseCustomContentWidth,
  resolveAppearance,
  type Theme,
} from "@/lib/appearance";
import {
  APPEARANCE_SHELL_PRESETS,
  APPEARANCE_QA_SCENARIOS,
  APPEARANCE_RECIPE_VERSION,
  AppearanceRecipeV1Schema,
  AppearanceRecipeV2Schema,
  DEFAULT_CONTENT_TEMPLATES_V1,
  applyAppearancePresetToRecipe,
  buildDefaultClassicAppearanceRecipe,
  getAppearancePresetCatalogQualityIssues,
  migrateAppearanceRecipeToCurrent,
  parseAppearanceRecipe,
  parseAppearanceRecipeExport,
  resolveAppearanceContentTemplates,
  resolveAppearanceMotionAttributes,
  resolveAppearanceRecipeForWrite,
  runAppearanceRecipeQualityChecks,
  serializeAppearanceRecipeExport,
} from "@/lib/appearance-recipe";
import { sanitizeCmsHtml } from "@/lib/content-sanitizer";
import { parseGlobalSettingsAppearance } from "@/lib/global-settings";
import { DEFAULT_GLOW } from "@/lib/glow";

const classicLegacyInput = {
  appearance: {
    ...DEFAULT_APPEARANCE,
    theme: "aurora" as const,
    frontendContentWidth: "1440",
    backendContentWidth: "900",
    fontPreset: "display" as const,
    radiusPreset: "rounded" as const,
    shadowPreset: "strong" as const,
  },
  headerContent: "<div>Header custom</div>",
  footerContent: "<p>Footer custom</p>",
  headerSettings: {
    showLogo: false,
    showSiteName: true,
    sticky: true,
    background: "#111111",
    glow: DEFAULT_GLOW,
  },
  footerSettings: {
    sticky: true,
    background: "#222222",
    glow: DEFAULT_GLOW,
    copyright: "Copyright 2026",
  },
  stickyHeaderHeight: 96,
  stickyFooterHeight: 128,
};

test("resolveAppearance falls back to the legacy default appearance", () => {
  const appearance = resolveAppearance(null);

  assert.equal(appearance.htmlClass, "theme-default");
  assert.equal(appearance.frontendContainerMaxWidth, "72rem");
  assert.equal(appearance.backendContainerMaxWidth, "72rem");
  assert.equal(appearance.cssVars["--background"], "oklch(1 0 0)");
  assert.equal(appearance.cssVars["--foreground"], "oklch(0.145 0 0)");
  assert.equal(appearance.cssVars["--radius"], "0.625rem");
  assert.equal(appearance.cssVars["--frontend-content-max-width"], "72rem");
  assert.equal(appearance.cssVars["--backend-content-max-width"], "72rem");
  assert.deepEqual(appearance.fontLinks, []);
});

test("resolveAppearance keeps the protected public shell themes addressable", () => {
  const smokeThemes: Array<{
    theme: Theme;
    htmlClass: string;
    background: string;
    foreground: string;
  }> = [
    {
      theme: "default",
      htmlClass: "theme-default",
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
    },
    {
      theme: "dark",
      htmlClass: "dark theme-dark",
      background: "oklch(0.145 0 0)",
      foreground: "oklch(0.985 0 0)",
    },
    {
      theme: "cyberpunk",
      htmlClass: "dark theme-cyberpunk",
      background: "oklch(0.12 0.04 295)",
      foreground: "oklch(0.96 0.05 180)",
    },
    {
      theme: "aurora",
      htmlClass: "dark theme-aurora",
      background: "oklch(0.14 0.05 270)",
      foreground: "oklch(0.96 0.03 180)",
    },
    {
      theme: "nordic",
      htmlClass: "theme-nordic",
      background: "oklch(0.985 0.01 245)",
      foreground: "oklch(0.2 0.035 250)",
    },
    {
      theme: "graphite",
      htmlClass: "dark theme-graphite",
      background: "oklch(0.18 0.005 250)",
      foreground: "oklch(0.94 0.006 250)",
    },
    {
      theme: "paper",
      htmlClass: "theme-paper",
      background: "oklch(0.985 0.012 95)",
      foreground: "oklch(0.2 0.03 70)",
    },
    {
      theme: "sage",
      htmlClass: "theme-sage",
      background: "oklch(0.975 0.012 145)",
      foreground: "oklch(0.2 0.035 160)",
    },
    {
      theme: "terracotta",
      htmlClass: "theme-terracotta",
      background: "oklch(0.975 0.018 75)",
      foreground: "oklch(0.22 0.04 45)",
    },
    {
      theme: "lavender",
      htmlClass: "theme-lavender",
      background: "oklch(0.985 0.015 300)",
      foreground: "oklch(0.22 0.045 285)",
    },
    {
      theme: "monochrome",
      htmlClass: "theme-monochrome",
      background: "oklch(0.995 0 0)",
      foreground: "oklch(0.12 0 0)",
    },
    {
      theme: "terminal",
      htmlClass: "dark theme-terminal",
      background: "oklch(0.11 0.03 145)",
      foreground: "oklch(0.91 0.06 145)",
    },
    {
      theme: "rose",
      htmlClass: "theme-rose",
      background: "oklch(0.985 0.012 5)",
      foreground: "oklch(0.22 0.04 350)",
    },
    {
      theme: "high-contrast",
      htmlClass: "dark theme-high-contrast",
      background: "oklch(0.05 0 0)",
      foreground: "oklch(1 0 0)",
    },
  ];

  for (const expected of smokeThemes) {
    const appearance = resolveAppearance({
      ...DEFAULT_APPEARANCE,
      theme: expected.theme,
    });

    assert.equal(appearance.htmlClass, expected.htmlClass);
    assert.equal(appearance.cssVars["--background"], expected.background);
    assert.equal(appearance.cssVars["--foreground"], expected.foreground);
    assert.ok(appearance.cssVars["--primary"]);
    assert.ok(appearance.cssVars["--primary-foreground"]);
  }
});

test("resolveAppearance covers every registered theme option", () => {
  for (const theme of THEMES) {
    const appearance = resolveAppearance({
      ...DEFAULT_APPEARANCE,
      theme,
    });

    assert.ok(appearance.htmlClass.includes(`theme-${theme}`));
    assert.ok(appearance.cssVars["--background"]);
    assert.ok(appearance.cssVars["--foreground"]);
    assert.ok(appearance.cssVars["--card"]);
    assert.ok(appearance.cssVars["--sidebar"]);
    assert.ok(appearance.cssVars["--ring"]);
  }
});

test("content width parsing and normalization preserve preset and custom values", () => {
  assert.equal(parseCustomContentWidth("900"), 900);
  assert.equal(parseCustomContentWidth("900px"), 900);
  assert.equal(parseCustomContentWidth("900 px"), 900);
  assert.equal(parseCustomContentWidth(900.9), 900);

  assert.equal(parseCustomContentWidth("0"), null);
  assert.equal(parseCustomContentWidth("10001"), null);
  assert.equal(parseCustomContentWidth("wide-ish"), null);
  assert.equal(parseCustomContentWidth("-1"), null);

  assert.equal(normalizeContentWidth("wide", "contained"), "wide");
  assert.equal(normalizeContentWidth("1200px", "contained"), "1200");
  assert.equal(normalizeContentWidth(1440, "contained"), "1440");
  assert.equal(normalizeContentWidth("0", "contained"), "contained");

  assert.equal(getContentWidthValue("full-width"), "100%");
  assert.equal(getContentWidthValue("ultra-wide"), "110rem");
  assert.equal(getContentWidthValue("1200"), "1200px");
});

test("global settings appearance fallback parsing returns legacy defaults for invalid data", () => {
  const parsed = parseGlobalSettingsAppearance({
    theme: "not-a-theme",
    frontendContentWidth: "0",
    backendContentWidth: "10001",
    fontPreset: "paint",
    radiusPreset: null,
    shadowPreset: undefined,
  });

  assert.deepEqual(parsed, DEFAULT_APPEARANCE);
});

test("global settings appearance fallback parsing normalizes valid custom widths", () => {
  const parsed = parseGlobalSettingsAppearance({
    theme: "aurora",
    frontendContentWidth: 1440,
    backendContentWidth: "900px",
    fontPreset: "display",
    radiusPreset: "rounded",
    shadowPreset: "strong",
  });

  assert.deepEqual(parsed, {
    theme: "aurora",
    frontendContentWidth: "1440",
    backendContentWidth: "900",
    fontPreset: "display",
    radiusPreset: "rounded",
    shadowPreset: "strong",
  });
});

test("AppearanceRecipe v1 schema validates an inert classic shell recipe", () => {
  const parsed = AppearanceRecipeV1Schema.parse({
    version: 1,
    name: "Classic",
    shell: {
      header: {
        slots: [
          {
            id: "brand",
            type: "Brand",
          },
          {
            id: "menu",
            type: "SiteMenu",
          },
          {
            id: "auth",
            type: "AuthControls",
            visibility: "always",
          },
        ],
      },
      main: {},
      footer: {
        slots: [
          {
            id: "footer-html",
            type: "CustomHtml",
            html: "<p>Links</p>",
          },
          {
            id: "copyright",
            type: "Copyright",
            text: "Night Raven CMS",
          },
        ],
      },
    },
  });

  assert.equal(parsed.version, 1);
  assert.equal(parsed.tokens.theme, DEFAULT_APPEARANCE.theme);
  assert.equal(parsed.shell.header.variant, "classic");
  assert.equal(parsed.shell.header.heightPx, 80);
  assert.equal(parsed.shell.main.variant, "normal");
  assert.equal(parsed.shell.footer.variant, "classic");
  assert.equal(parsed.shell.footer.minHeightPx, 110);
  assert.equal(parsed.contentTemplates.blogPost.metadataTreatment, "inline");
  assert.equal(parsed.contentTemplates.blogCategory.variant, "list");
  assert.equal(parsed.contentTemplates.page.variant, "contained-builder");
});

test("AppearanceRecipe v2 schema validates governance defaults", () => {
  const parsed = AppearanceRecipeV2Schema.parse({
    version: APPEARANCE_RECIPE_VERSION,
    shell: {
      header: {
        slots: [{ id: "brand", type: "Brand" }],
      },
      main: {},
      footer: {
        slots: [],
      },
    },
  });

  assert.equal(parsed.version, APPEARANCE_RECIPE_VERSION);
  assert.equal(parsed.motion.motionPreference, "system");
  assert.equal(parsed.motion.backgroundEffects, "system");
});

test("content template and motion resolvers tolerate stale cached recipe shapes", () => {
  assert.deepEqual(
    resolveAppearanceContentTemplates(undefined),
    DEFAULT_CONTENT_TEMPLATES_V1,
  );
  assert.deepEqual(resolveAppearanceMotionAttributes(undefined), {
    motionPreference: "system",
    backgroundEffects: "system",
  });
});

test("AppearanceRecipe v1 schema validates curated shell variants and safe slots", () => {
  const parsed = AppearanceRecipeV1Schema.parse({
    version: 1,
    shell: {
      header: {
        variant: "centered",
        slots: [
          {
            id: "search",
            type: "Search",
            enabled: true,
            placeholder: "Search content",
          },
          {
            id: "cta",
            type: "CTA",
            enabled: true,
            label: "Start",
            href: "/dashboard",
          },
        ],
      },
      main: {
        variant: "framed",
      },
      footer: {
        variant: "multi-column",
        slots: [
          {
            id: "links",
            type: "FooterLinks",
            enabled: true,
            links: [{ label: "Blog", href: "/blog" }],
          },
        ],
      },
    },
  });

  assert.equal(parsed.shell.header.variant, "centered");
  assert.equal(parsed.shell.main.variant, "framed");
  assert.equal(parsed.shell.footer.variant, "multi-column");
});

test("buildDefaultClassicAppearanceRecipe derives a classic recipe from legacy fields", () => {
  const recipe = buildDefaultClassicAppearanceRecipe(classicLegacyInput);

  assert.equal(recipe.version, APPEARANCE_RECIPE_VERSION);
  assert.equal(recipe.name, "Classic");
  assert.deepEqual(recipe.tokens, classicLegacyInput.appearance);
  assert.deepEqual(recipe.motion, {
    motionPreference: "system",
    backgroundEffects: "system",
  });
  assert.equal(recipe.shell.header.variant, "classic");
  assert.equal(recipe.shell.header.sticky, true);
  assert.equal(recipe.shell.header.heightPx, 96);
  assert.equal(recipe.shell.header.background, "#111111");
  assert.deepEqual(recipe.shell.header.slots[0], {
    id: "brand",
    type: "Brand",
    enabled: true,
    visibility: "always",
    showLogo: false,
    showSiteName: true,
  });
  assert.deepEqual(recipe.shell.header.slots[1], {
    id: "header-custom-html",
    type: "CustomHtml",
    enabled: true,
    visibility: "always",
    html: "<div>Header custom</div>",
  });
  assert.equal(recipe.shell.footer.variant, "classic");
  assert.equal(recipe.shell.footer.sticky, true);
  assert.equal(recipe.shell.footer.minHeightPx, 128);
  assert.equal(recipe.shell.footer.background, "#222222");
  assert.deepEqual(recipe.contentTemplates, {
    blogPost: {
      metadataTreatment: "inline",
      coverPlacement: "top",
      excerptTreatment: "lead",
      commentsPlacement: "after-content",
      editAffordancePlacement: "title-inline",
    },
    blogCategory: {
      variant: "list",
    },
    page: {
      variant: "contained-builder",
    },
  });
  assert.deepEqual(recipe.shell.footer.slots[0], {
    id: "footer-custom-html",
    type: "CustomHtml",
    enabled: true,
    visibility: "always",
    html: "<p>Footer custom</p>",
  });
  assert.deepEqual(recipe.shell.footer.slots[1], {
    id: "copyright",
    type: "Copyright",
    enabled: true,
    visibility: "always",
    text: "Copyright 2026",
  });
});

test("parseAppearanceRecipe resolves missing or empty JSONB to the legacy classic recipe", () => {
  assert.deepEqual(
    parseAppearanceRecipe(undefined, classicLegacyInput),
    buildDefaultClassicAppearanceRecipe(classicLegacyInput),
  );
  assert.deepEqual(
    parseAppearanceRecipe({}, classicLegacyInput),
    buildDefaultClassicAppearanceRecipe(classicLegacyInput),
  );
});

test("migrateAppearanceRecipeToCurrent upgrades v1 and unversioned recipes", () => {
  const v1Recipe = AppearanceRecipeV1Schema.parse({
    version: 1,
    name: "Old recipe",
    shell: {
      header: { variant: "minimal", slots: [] },
      main: { variant: "framed" },
      footer: { variant: "minimal", slots: [] },
    },
  });
  const migrated = migrateAppearanceRecipeToCurrent(v1Recipe);
  const unversioned = migrateAppearanceRecipeToCurrent({
    name: "Unversioned",
    shell: {
      header: { slots: [] },
      main: {},
      footer: { slots: [] },
    },
  });

  assert.ok(migrated);
  assert.equal(migrated.version, APPEARANCE_RECIPE_VERSION);
  assert.equal(migrated.shell.header.variant, "minimal");
  assert.equal(migrated.motion.backgroundEffects, "system");
  assert.ok(unversioned);
  assert.equal(unversioned.version, APPEARANCE_RECIPE_VERSION);
  assert.equal(migrateAppearanceRecipeToCurrent({ version: 99 }), null);
});

test("parseAppearanceRecipe validates populated recipes but keeps legacy fields authoritative", () => {
  const recipe = parseAppearanceRecipe(
    {
      version: 1,
      name: "Stored draft",
      tokens: {
        ...DEFAULT_APPEARANCE,
        theme: "dark",
      },
      shell: {
        header: {
          sticky: false,
          heightPx: 64,
          slots: [
            {
              id: "brand",
              type: "Brand",
              enabled: false,
              showLogo: true,
              showSiteName: false,
            },
          ],
        },
        main: {},
        footer: {
          sticky: false,
          minHeightPx: 10,
          slots: [],
        },
      },
      contentTemplates: {
        blogPost: {
          metadataTreatment: "eyebrow",
          coverPlacement: "hero",
          excerptTreatment: "callout",
          commentsPlacement: "aside",
          editAffordancePlacement: "header-actions",
        },
        blogCategory: { variant: "featured-first" },
        page: { variant: "landing-mode" },
      },
    },
    classicLegacyInput,
  );

  assert.equal(recipe.version, APPEARANCE_RECIPE_VERSION);
  assert.equal(recipe.name, "Stored draft");
  assert.equal(recipe.motion.motionPreference, "system");
  assert.deepEqual(recipe.tokens, classicLegacyInput.appearance);
  assert.equal(recipe.shell.header.sticky, true);
  assert.equal(recipe.shell.header.heightPx, 96);
  assert.equal(recipe.shell.header.slots.length, 7);
  assert.equal(recipe.shell.footer.sticky, true);
  assert.equal(recipe.shell.footer.minHeightPx, 128);
  assert.equal(recipe.shell.footer.slots.length, 6);
  assert.equal(recipe.contentTemplates.blogPost.metadataTreatment, "eyebrow");
  assert.equal(recipe.contentTemplates.blogPost.coverPlacement, "hero");
  assert.equal(recipe.contentTemplates.blogPost.commentsPlacement, "aside");
  assert.equal(recipe.contentTemplates.blogCategory.variant, "featured-first");
  assert.equal(recipe.contentTemplates.page.variant, "landing-mode");
});

test("parseAppearanceRecipe preserves stored variants and safe slots while keeping legacy fields authoritative", () => {
  const recipe = parseAppearanceRecipe(
    {
      version: 1,
      name: "Stored variants",
      tokens: {
        ...DEFAULT_APPEARANCE,
        theme: "dark",
      },
      shell: {
        header: {
          variant: "split",
          sticky: false,
          heightPx: 64,
          slots: [
            {
              id: "site-menu",
              type: "SiteMenu",
              enabled: false,
            },
            {
              id: "header-search",
              type: "Search",
              enabled: true,
              placeholder: "Find",
              action: "/",
            },
          ],
        },
        main: {
          variant: "category-grid",
        },
        footer: {
          variant: "CTA",
          sticky: false,
          minHeightPx: 10,
          slots: [
            {
              id: "footer-links",
              type: "FooterLinks",
              enabled: true,
              links: [{ label: "Archive", href: "/archive" }],
            },
          ],
        },
      },
    },
    classicLegacyInput,
  );

  assert.equal(recipe.name, "Stored variants");
  assert.deepEqual(recipe.tokens, classicLegacyInput.appearance);
  assert.equal(recipe.shell.header.variant, "split");
  assert.equal(recipe.shell.header.sticky, true);
  assert.equal(recipe.shell.header.heightPx, 96);
  assert.equal(recipe.shell.main.variant, "category-grid");
  assert.equal(recipe.shell.footer.variant, "CTA");
  assert.equal(recipe.shell.footer.sticky, true);
  assert.equal(recipe.shell.footer.minHeightPx, 128);
  assert.equal(
    recipe.shell.header.slots.find((slot) => slot.id === "site-menu")?.enabled,
    false,
  );
  const searchSlot = recipe.shell.header.slots.find(
    (slot) => slot.id === "header-search",
  );
  assert.equal(searchSlot?.type, "Search");
  assert.equal(searchSlot?.enabled, true);
  if (searchSlot?.type === "Search") {
    assert.equal(searchSlot.placeholder, "Find");
  }
  const footerLinksSlot = recipe.shell.footer.slots.find(
    (slot) => slot.id === "footer-links",
  );
  assert.equal(footerLinksSlot?.type, "FooterLinks");
  assert.equal(footerLinksSlot?.enabled, true);
  if (footerLinksSlot?.type === "FooterLinks") {
    assert.deepEqual(footerLinksSlot.links, [
      { label: "Archive", href: "/archive" },
    ]);
  }
});

test("parseAppearanceRecipe falls back to classic when stored recipe validation fails", () => {
  const recipe = parseAppearanceRecipe(
    {
      version: 1,
      shell: {
        header: {
          variant: "sidebar",
          slots: [],
        },
        main: {},
        footer: {
          slots: [],
        },
      },
    },
    classicLegacyInput,
  );

  assert.deepEqual(
    recipe,
    buildDefaultClassicAppearanceRecipe(classicLegacyInput),
  );
});

test("resolveAppearanceRecipeForWrite disables unsafe or empty CTA slots", () => {
  const recipe = resolveAppearanceRecipeForWrite(
    {
      version: 1,
      shell: {
        header: {
          variant: "minimal",
          slots: [
            {
              id: "header-cta",
              type: "CTA",
              enabled: true,
              label: "",
              href: "/start",
            },
          ],
        },
        main: {
          variant: "normal",
        },
        footer: {
          variant: "classic",
          slots: [],
        },
      },
    },
    classicLegacyInput,
  );

  assert.equal(recipe.shell.header.variant, "minimal");
  assert.equal(
    recipe.shell.header.slots.find((slot) => slot.id === "header-cta")?.enabled,
    false,
  );
});

test("appearance shell presets are valid draft recipes", () => {
  const classic = buildDefaultClassicAppearanceRecipe(classicLegacyInput);

  for (const preset of APPEARANCE_SHELL_PRESETS) {
    const recipe = applyAppearancePresetToRecipe(classic, preset);
    const parsed = AppearanceRecipeV2Schema.parse(recipe);

    assert.equal(parsed.name, preset.name);
    assert.deepEqual(parsed.tokens, preset.appearance);
    assert.equal(parsed.shell.header.variant, preset.header.variant);
    assert.equal(parsed.shell.main.variant, preset.main.variant);
    assert.equal(parsed.shell.footer.variant, preset.footer.variant);
    assert.deepEqual(parsed.contentTemplates, preset.contentTemplates);
  }
});

test("appearance shell presets use only dark starter themes", () => {
  const darkStarterThemes = new Set([
    "aurora",
    "cyberpunk",
    "dark",
    "midnight",
    "obsidian",
  ]);

  for (const preset of APPEARANCE_SHELL_PRESETS) {
    assert.equal(
      darkStarterThemes.has(preset.appearance.theme),
      true,
      `${preset.name} should use a dark starter theme`,
    );
  }
});

test("applying a preset preserves identity, menu slots, and existing content slots", () => {
  const classic = buildDefaultClassicAppearanceRecipe(classicLegacyInput);
  const current = {
    ...classic,
    shell: {
      ...classic.shell,
      header: {
        ...classic.shell.header,
        slots: classic.shell.header.slots.map((slot) => {
          if (slot.id === "brand" && slot.type === "Brand") {
            return { ...slot, showLogo: false, showSiteName: true };
          }
          if (slot.id === "site-menu" && slot.type === "SiteMenu") {
            return { ...slot, enabled: false };
          }
          return slot;
        }),
      },
    },
  };
  const preset = APPEARANCE_SHELL_PRESETS.find(
    (item) => item.id === "saas-product",
  );
  assert.ok(preset);
  const recipe = applyAppearancePresetToRecipe(current, preset);
  const brandSlot = recipe.shell.header.slots.find(
    (slot) => slot.id === "brand",
  );
  const menuSlot = recipe.shell.header.slots.find(
    (slot) => slot.id === "site-menu",
  );
  const headerHtmlSlot = recipe.shell.header.slots.find(
    (slot) => slot.id === "header-custom-html",
  );
  const footerHtmlSlot = recipe.shell.footer.slots.find(
    (slot) => slot.id === "footer-custom-html",
  );

  assert.equal(recipe.shell.header.variant, "compact-app");
  assert.equal(recipe.shell.footer.variant, "CTA");
  assert.equal(brandSlot?.type, "Brand");
  if (brandSlot?.type === "Brand") {
    assert.equal(brandSlot.showLogo, false);
    assert.equal(brandSlot.showSiteName, true);
  }
  assert.equal(menuSlot?.enabled, false);
  assert.equal(headerHtmlSlot?.type, "CustomHtml");
  if (headerHtmlSlot?.type === "CustomHtml") {
    assert.equal(headerHtmlSlot.html, classicLegacyInput.headerContent);
  }
  assert.equal(footerHtmlSlot?.type, "CustomHtml");
  if (footerHtmlSlot?.type === "CustomHtml") {
    assert.equal(footerHtmlSlot.html, classicLegacyInput.footerContent);
  }
  assert.equal(recipe.contentTemplates.page.variant, "framed-builder");
  assert.equal(recipe.contentTemplates.blogCategory.variant, "cards");
});

test("appearance recipe export/import migrates and strips portable HTML slots", () => {
  const classic = buildDefaultClassicAppearanceRecipe(classicLegacyInput);
  const exported = serializeAppearanceRecipeExport(classic);
  const imported = parseAppearanceRecipeExport(exported);

  assert.equal(JSON.parse(exported).kind, "nr-cms.appearance-recipe");
  assert.equal(imported.success, true);
  if (imported.success) {
    assert.equal(imported.recipe.version, APPEARANCE_RECIPE_VERSION);
    const headerHtmlSlot = imported.recipe.shell.header.slots.find(
      (slot) => slot.id === "header-custom-html",
    );
    assert.equal(headerHtmlSlot?.type, "CustomHtml");
    if (headerHtmlSlot?.type === "CustomHtml") {
      assert.equal(headerHtmlSlot.enabled, false);
      assert.equal(headerHtmlSlot.html, "");
    }
  }

  const rawV1Import = parseAppearanceRecipeExport(
    JSON.stringify({
      version: 1,
      shell: {
        header: { slots: [] },
        main: {},
        footer: { slots: [] },
      },
    }),
  );
  assert.equal(rawV1Import.success, true);
  if (rawV1Import.success) {
    assert.equal(rawV1Import.recipe.version, APPEARANCE_RECIPE_VERSION);
  }

  assert.deepEqual(parseAppearanceRecipeExport("{not json}"), {
    success: false,
    error: "Import must be valid JSON.",
  });
});

test("appearance recipe quality gates cover scenarios, contrast, and sticky behavior", () => {
  const classic = buildDefaultClassicAppearanceRecipe(classicLegacyInput);
  const issues = runAppearanceRecipeQualityChecks(classic);
  const stickyIssues = runAppearanceRecipeQualityChecks({
    ...classic,
    shell: {
      ...classic.shell,
      header: {
        ...classic.shell.header,
        sticky: true,
        heightPx: 320,
      },
      footer: {
        ...classic.shell.footer,
        sticky: true,
        minHeightPx: 320,
      },
    },
  });

  assert.equal(APPEARANCE_QA_SCENARIOS.length, 9);
  assert.equal(
    issues.some((issue) => issue.code === "motion-missing"),
    false,
  );
  assert.ok(
    stickyIssues.some((issue) => issue.code === "sticky-combined-height"),
  );
});

test("appearance preset catalog has at least three materially different appearances", () => {
  assert.deepEqual(getAppearancePresetCatalogQualityIssues(), []);
  assert.equal(
    getAppearancePresetCatalogQualityIssues([APPEARANCE_SHELL_PRESETS[0]])
      .length,
    1,
  );
});

test("PageTemplate renders semantic page-builder variants", () => {
  const fullBleed = renderToStaticMarkup(
    createElement(
      PageTemplate,
      { template: { variant: "full-bleed-builder" } },
      createElement("section", null, "Builder"),
    ),
  );
  const framed = renderToStaticMarkup(
    createElement(
      PageTemplate,
      { template: { variant: "framed-builder" } },
      createElement("section", null, "Builder"),
    ),
  );

  assert.ok(fullBleed.includes('data-page-template="full-bleed-builder"'));
  assert.ok(fullBleed.includes("w-screen"));
  assert.ok(framed.includes('data-page-template="framed-builder"'));
  assert.ok(framed.includes("bg-card"));
});

test("BlogPostTemplate keeps edit and comments affordances across placements", () => {
  const html = renderToStaticMarkup(
    createElement(
      BlogPostTemplate,
      {
        template: {
          metadataTreatment: "eyebrow",
          coverPlacement: "hero",
          excerptTreatment: "callout",
          commentsPlacement: "aside",
          editAffordancePlacement: "header-actions",
        },
        title: "Template post",
        coverImage: "https://example.com/cover.jpg",
        excerpt: "A short excerpt.",
        authorName: "Ada Lovelace",
        formattedDate: "May 26, 2026",
        dateTime: "2026-05-26T00:00:00.000Z",
        canEdit: true,
        editHref: "/dashboard/content/post-id/edit",
        comments: createElement("section", { id: "comments" }, "Comments"),
      },
      createElement("article", { className: "cms-content" }, "Body"),
    ),
  );

  assert.ok(html.includes('data-blog-post-metadata="eyebrow"'));
  assert.ok(html.includes('data-blog-post-cover="hero"'));
  assert.ok(html.includes('data-blog-post-comments="aside"'));
  assert.ok(html.includes("Edit post"));
  assert.ok(html.includes('href="/dashboard/content/post-id/edit"'));
  assert.ok(html.includes('id="comments"'));
});

test("BlogCategoryTemplate renders category variants", () => {
  const posts = [
    {
      id: "one",
      slug: "one",
      title: "One",
      excerpt: "First post",
      coverImage: null,
      authorName: "Author",
      formattedDate: "May 26, 2026",
      dateTime: "2026-05-26T00:00:00.000Z",
    },
    {
      id: "two",
      slug: "two",
      title: "Two",
      excerpt: null,
      coverImage: null,
      authorName: null,
      formattedDate: null,
      dateTime: null,
    },
  ];
  const html = renderToStaticMarkup(
    createElement(BlogCategoryTemplate, {
      template: { variant: "featured-first" },
      categoryName: "News",
      posts,
    }),
  );

  assert.ok(html.includes('data-blog-category-template="featured-first"'));
  assert.ok(html.includes("News"));
  assert.ok(html.includes('href="/one"'));
  assert.ok(html.includes('href="/two"'));
});

test("SiteFooter renders the classic footer slots with legacy classes", () => {
  const recipe = buildDefaultClassicAppearanceRecipe(classicLegacyInput);
  const html = renderToStaticMarkup(
    createElement(SiteFooter, { region: recipe.shell.footer }),
  );

  assert.ok(
    html.startsWith(
      '<footer class="site-footer bg-background mt-auto px-4 py-8 text-sm text-muted-foreground sm:px-6 sticky bottom-0 z-50" style="min-height:128px;background-color:#222222">',
    ),
  );
  assert.ok(
    html.includes(
      '<div class="site-content-container mx-auto flex w-full min-w-0 flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-6">',
    ),
  );
  assert.ok(
    html.includes(
      '<div class="cms-content min-w-0 max-w-full text-sm [&amp;_a]:underline [&amp;_a]:hover:text-foreground"><p>Footer custom</p></div>',
    ),
  );
  assert.ok(
    html.includes(
      '<div class="min-w-0 max-w-full break-words sm:shrink-0 sm:text-right"><span>Copyright 2026</span></div>',
    ),
  );
});

test("CMS HTML sanitizer removes executable markup and editor artifacts", () => {
  const html = sanitizeCmsHtml(
    '<div class="ProseMirror" contenteditable="true"><p data-placeholder="Enter footer content..." class="is-empty"></p><p><a href="javascript:alert(1)" onclick="alert(1)">Bad</a><script>alert(1)</script><img class="ProseMirror-separator" alt=""><svg contenteditable="false" viewBox="0 0 10 10"><path d="M0 0h10v10z" onclick="alert(1)"></path></svg></p></div>',
  );

  assert.equal(html.includes("script"), false);
  assert.equal(html.includes("javascript:"), false);
  assert.equal(html.includes("onclick"), false);
  assert.equal(html.includes("contenteditable"), false);
  assert.equal(html.includes("ProseMirror-separator"), false);
  assert.equal(html.includes("data-placeholder"), false);
  assert.ok(html.includes("<svg"));
  assert.ok(html.includes("<path"));
});

test("SiteFooter hidden variant renders no footer", () => {
  const recipe = buildDefaultClassicAppearanceRecipe(classicLegacyInput);
  const html = renderToStaticMarkup(
    createElement(SiteFooter, {
      region: { ...recipe.shell.footer, variant: "hidden" },
    }),
  );

  assert.equal(html, "");
});

test("SiteMain renders full-bleed and framed surface variants", () => {
  const fullBleed = renderToStaticMarkup(
    createElement(
      SiteMain,
      {
        region: { variant: "full-bleed-builder" },
      },
      createElement("div", null, "Builder"),
    ),
  );
  const framed = renderToStaticMarkup(
    createElement(
      SiteMain,
      {
        region: { variant: "framed" },
      },
      createElement("div", null, "Framed"),
    ),
  );

  assert.ok(fullBleed.includes('data-main-variant="full-bleed-builder"'));
  assert.ok(!fullBleed.includes("padding-top"));
  assert.ok(!fullBleed.includes("padding-bottom"));
  assert.ok(framed.includes('data-main-variant="framed"'));
  assert.ok(framed.includes("rounded-lg border bg-background"));
});
