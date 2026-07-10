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
import {
  CONTENT_DASHBOARD_SOURCE_STRINGS,
  CONTENT_DASHBOARD_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/content-dashboard-translations";
import {
  CONTENT_CATEGORIES_SOURCE_STRINGS,
  CONTENT_CATEGORIES_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/content-categories-translations";
import {
  FILE_MANAGER_SOURCE_STRINGS,
  FILE_MANAGER_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/file-manager-translations";
import {
  FORM_BUILDER_SOURCE_STRINGS,
  FORM_BUILDER_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/form-builder-translations";
import {
  GALLERY_MANAGER_SOURCE_STRINGS,
  GALLERY_MANAGER_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/gallery-manager-translations";
import {
  USER_MANAGEMENT_SOURCE_STRINGS,
  USER_MANAGEMENT_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/user-management-translations";
import {
  MENU_MANAGEMENT_SOURCE_STRINGS,
  MENU_MANAGEMENT_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/menu-management-translations";
import {
  FILE_MANAGER_DELETE_SOURCE_STRINGS,
  FILE_MANAGER_DELETE_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/file-manager-delete-translations";
import {
  CONTENT_NEW_CHOICE_SOURCE_STRINGS,
  CONTENT_NEW_CHOICE_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/content-new-choice-translations";
import {
  CONTENT_EDITOR_ADDITIONAL_SOURCE_TRANSLATIONS,
  CONTENT_EDITOR_DIALOG_SOURCE_STRINGS,
  CONTENT_EDITOR_SOURCE_STRINGS,
  CONTENT_EDITOR_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/content-editor-translations";
import { en } from "@/lib/i18n/messages/en";
import {
  BACKEND_WEBSHOP_MENU_SOURCE_STRINGS,
  BACKEND_WEBSHOP_MENU_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/backend-menu-translations";
import {
  WEBSHOP_ADMIN_DASHBOARD_SOURCE_STRINGS,
  WEBSHOP_ADMIN_DASHBOARD_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/webshop-admin-dashboard-translations";
import {
  GLOBAL_SETTINGS_CONTROL_SOURCE_STRINGS,
  GLOBAL_SETTINGS_CONTROL_SOURCE_TRANSLATIONS,
  GLOBAL_SETTINGS_SOURCE_STRINGS,
  GLOBAL_SETTINGS_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/global-settings-translations";
import {
  GLOBAL_SETTINGS_APPEARANCE_SOURCE_STRINGS,
  GLOBAL_SETTINGS_APPEARANCE_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/global-settings-appearance-translations";
import {
  GLOBAL_SETTINGS_FORM_SOURCE_STRINGS,
  GLOBAL_SETTINGS_FORM_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/global-settings-form-translations";
import {
  GLOBAL_SETTINGS_HELP_SOURCE_STRINGS,
  GLOBAL_SETTINGS_HELP_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/global-settings-help-translations";
import {
  GLOBAL_SETTINGS_OPTION_SOURCE_STRINGS,
  GLOBAL_SETTINGS_OPTION_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/global-settings-option-translations";
import {
  GLOBAL_SETTINGS_PRESET_SOURCE_STRINGS,
  GLOBAL_SETTINGS_PRESET_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/global-settings-preset-translations";
import {
  GLOBAL_SETTINGS_SESSION_SOURCE_STRINGS,
  GLOBAL_SETTINGS_SESSION_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/global-settings-session-translations";
import {
  HERO_SLIDER_SOURCE_STRINGS,
  HERO_SLIDER_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/hero-slider-translations";
import {
  LOCK_UI_SOURCE_STRINGS,
  LOCK_UI_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/lock-ui-translations";
import {
  PAGE_BUILDER_SOURCE_STRINGS,
  PAGE_BUILDER_SOURCE_TRANSLATIONS,
} from "@/lib/i18n/messages/page-builder-translations";
import { createDefaultHeroSlider } from "@/lib/hero-slider";
import { localizeSourceString } from "@/lib/i18n/messages/localized";
import { createTranslator } from "@/lib/i18n/translate";
import { APPEARANCE_SHELL_PRESETS } from "@/lib/appearance-recipe";
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

const GLOBAL_SETTINGS_ALLOWED_SAME_AS_ENGLISH = new Set([
  "AI",
  "CMS",
  "CTA",
  "CustomHtml",
  "URL",
  "API key",
]);

const BACKEND_WEBSHOP_NAV_KEYS = [
  "dashboard.nav.webshop",
  "dashboard.nav.webshopSettings",
  "dashboard.nav.webshopStorefront",
  "dashboard.nav.webshopCategories",
  "dashboard.nav.webshopProducts",
  "dashboard.nav.webshopOrders",
  "dashboard.nav.webshopWishlist",
  "dashboard.nav.webshopPromotions",
] as const;

const VISIBLE_CONTENT_DASHBOARD_KEYS = [
  "dashboard.content.description",
  "dashboard.content.newContent",
  "dashboard.content.tabs.deleted",
  "dashboard.content.searchPlaceholder",
  "dashboard.filters.allTypes",
  "dashboard.filters.allCategories",
  "dashboard.filters.allStatuses",
  "dashboard.filters.allAuthors",
  "dashboard.pagination.pageOfTotal",
  "dashboard.pagination.previous",
  "dashboard.pagination.next",
  "dashboard.pagination.rowsPerPage",
  "dashboard.pagination.showingOfTotal",
  "dashboard.pagination.showingFilesOfTotal",
  "dashboard.content.table.updated",
  "dashboard.content.empty",
  "dashboard.content.deletedEmpty",
  "dashboard.content.type.hero_slider",
  "dashboard.content.status.draft",
  "dashboard.content.status.in_review",
  "dashboard.content.status.approved",
  "dashboard.content.status.published",
  "dashboard.content.status.archived",
  "dashboard.content.actions.preview",
  "dashboard.content.actions.unpublishToDraft",
  "dashboard.content.actions.archive",
  "dashboard.content.actions.reassignAuthor",
  "dashboard.content.actions.moveToDeleted",
  "dashboard.content.actions.approve",
  "dashboard.content.actions.publishNow",
  "dashboard.content.actions.moveToDraft",
  "dashboard.content.actions.submitForReview",
  "dashboard.content.actions.returnToDraft",
  "dashboard.content.actions.restore",
  "dashboard.content.actions.permanentlyDelete",
  "dashboard.content.actions.setHomepage",
  "dashboard.content.dialogs.deleteTitle",
  "dashboard.content.dialogs.deleteDescription",
  "dashboard.content.dialogs.deleteSelectedTitle",
  "dashboard.content.dialogs.deleteSelectedDescription",
  "dashboard.content.dialogs.restoreTitle",
  "dashboard.content.dialogs.restoreDescription",
  "dashboard.content.dialogs.permanentlyDeleteTitle",
  "dashboard.content.dialogs.permanentlyDeleteDescription",
  "dashboard.content.dialogs.reassignAuthorTitle",
  "dashboard.content.dialogs.reassignAuthorDescription",
  "dashboard.content.history.backToEditor",
  "dashboard.content.history.revisionTitle",
  "dashboard.content.history.revisionNavigation",
  "dashboard.content.history.openPreviousRevision",
  "dashboard.content.history.openNextRevision",
  "dashboard.content.history.previous",
  "dashboard.content.history.next",
  "dashboard.content.history.restoredToast",
  "dashboard.content.history.restoreFailed",
  "dashboard.content.history.restoreTitle",
  "dashboard.content.history.restoreDescription",
  "dashboard.content.history.restoreImpact",
  "dashboard.content.history.slugChanges",
  "dashboard.content.history.statusChanges",
  "dashboard.content.history.revisionWasHomepage",
  "dashboard.content.history.revisionWasNotHomepage",
  "dashboard.content.history.scheduleFieldsChange",
  "dashboard.content.history.expiredScheduleCleared",
  "dashboard.content.history.meta.actor",
  "dashboard.content.history.meta.created",
  "dashboard.content.history.meta.author",
  "dashboard.content.history.meta.homepage",
  "dashboard.content.history.meta.publishAt",
  "dashboard.content.history.meta.unpublishAt",
  "dashboard.content.history.meta.metaTitle",
  "dashboard.content.history.meta.metaDescription",
  "dashboard.content.history.changeType.saved",
  "dashboard.content.history.changeType.submitted_for_review",
  "dashboard.content.history.changeType.published",
  "dashboard.content.history.changeType.unpublished",
  "dashboard.content.history.changeType.restored",
  "dashboard.content.history.changeType.deleted_snapshot",
  "dashboard.content.history.changeType.reassigned_author",
  "public.preview.notPublic",
  "public.preview.expires",
  "public.preview.editContent",
  "dashboard.content.schedule.scheduled",
  "dashboard.content.schedule.liveUntil",
  "dashboard.content.schedule.expired",
] as const;

const VISIBLE_CONTENT_CATEGORIES_KEYS = [
  "dashboard.contentCategories.title",
  "dashboard.contentCategories.description",
  "dashboard.contentCategories.tabs.page",
  "dashboard.contentCategories.tabs.blogPost",
  "dashboard.contentCategories.tabs.webshop",
  "dashboard.contentCategories.types.page",
  "dashboard.contentCategories.types.blogPost",
  "dashboard.contentCategories.types.pageLower",
  "dashboard.contentCategories.types.blogPostLower",
  "dashboard.contentCategories.filters.searchPlaceholder",
  "dashboard.contentCategories.filters.authorPlaceholder",
  "dashboard.contentCategories.filters.allAuthors",
  "dashboard.contentCategories.table.title",
  "dashboard.contentCategories.table.name",
  "dashboard.contentCategories.table.items",
  "dashboard.contentCategories.table.author",
  "dashboard.contentCategories.table.updated",
  "dashboard.contentCategories.table.actions",
  "dashboard.contentCategories.table.selectAll",
  "dashboard.contentCategories.table.selectCategory",
  "dashboard.contentCategories.table.updatedBy",
  "dashboard.contentCategories.table.emptySearch",
  "dashboard.contentCategories.table.empty",
  "dashboard.contentCategories.actions.addCategory",
  "dashboard.contentCategories.actions.create",
  "dashboard.contentCategories.actions.delete",
  "dashboard.contentCategories.actions.edit",
  "dashboard.contentCategories.actions.save",
  "dashboard.contentCategories.actions.cancel",
  "dashboard.contentCategories.dialogs.createTitle",
  "dashboard.contentCategories.dialogs.createDescription",
  "dashboard.contentCategories.dialogs.editTitle",
  "dashboard.contentCategories.dialogs.editDescription",
  "dashboard.contentCategories.dialogs.deleteTitle",
  "dashboard.contentCategories.dialogs.deleteDescription",
  "dashboard.contentCategories.dialogs.deleteSelected",
  "dashboard.contentCategories.dialogs.deleteSelectedTitle",
  "dashboard.contentCategories.dialogs.deleteSelectedDescription",
  "dashboard.contentCategories.form.categoryName",
  "dashboard.contentCategories.form.categoryNamePlaceholder",
  "dashboard.contentCategories.form.author",
  "dashboard.contentCategories.form.selectUserPlaceholder",
  "dashboard.contentCategories.validation.nameRequired",
  "dashboard.contentCategories.validation.nameMax",
  "dashboard.contentCategories.validation.authorRequired",
  "dashboard.contentCategories.validation.ownerRequired",
  "dashboard.contentCategories.validation.invalidCategoryId",
  "dashboard.contentCategories.validation.duplicateName",
  "dashboard.contentCategories.validation.targetUserBackend",
  "dashboard.contentCategories.validation.categoryInUse",
  "dashboard.contentCategories.validation.selectedCategoriesInUse",
  "dashboard.contentCategories.validation.generic",
] as const;

const CONTENT_CATEGORIES_ALLOWED_SAME_AS_ENGLISH = new Set([
  "Actions",
  "Items",
  "Name",
  "page",
  "Slug",
  "Status",
]);

const CONTENT_REASSIGN_SOURCE_STRINGS = [
  "Select a new author for {title}. Only admins can perform this action.",
  "Select a user...",
  "Search users...",
  "Loading users...",
  "No backend users found.",
  "Load more",
  "current",
  "Target user must be a backend user.",
  "This content changed before reassignment completed. Reload and try again.",
  "Something went wrong.",
  "Content not found.",
  "Reassigned content author.",
] as const;

const CONTENT_DELETE_SOURCE_STRINGS = [
  "Delete this content?",
  "{title} will be moved to Deleted content with its revision history.",
  "Delete selected content?",
  "{count} item(s) will be moved to Deleted content. Items you do not have permission to delete or that are the homepage will be skipped.",
  "Restore this deleted content?",
  "{title} will be moved back to regular content with its revision history.",
  "Permanently delete this content?",
  "This will delete {title}, comments, and all revision history. This cannot be undone.",
  "Cannot delete the homepage. Assign another page as homepage first.",
  "Content is already deleted.",
  "Content is not deleted.",
  "Only deleted content can be permanently deleted.",
  "Moved content to deleted items.",
  "Restored deleted content.",
  "Invalid id.",
  "Invalid input.",
] as const;

const CONTENT_PAGINATION_SOURCE_STRINGS = [
  "Page {page} of {totalPages} - {total} total",
  "Previous",
  "Next",
  "Rows per page",
  "Showing {count} of {total}",
  "Showing {count} of {total} files",
] as const;

const CONTENT_HISTORY_SOURCE_STRINGS = [
  "Back to editor",
  "Revision #{revision}",
  "Revision navigation",
  "Open previous revision #{revision}",
  "Open next revision #{revision}",
  "Changed by",
  "Created",
  "Author",
  "Homepage",
  "Publish at",
  "Unpublish at",
  "Meta title",
  "Meta description",
  "Preview - not public",
  "Preview link expires {date}",
  "Edit content",
  "Saved",
  "Submitted for review",
  "Published",
  "Unpublished",
  "Restored",
  "Deleted snapshot",
  "Reassigned author",
  "Revision #{revisionNumber} restored.",
  "Restore revision #{revisionNumber}?",
  "This replaces the saved content with this revision snapshot and then returns you to the editor.",
  "Revision #{revision} restored.",
  "Restore revision #{revision}?",
  "This replaces the saved content with the revision snapshot and creates a new revision of the current state first.",
  "Restore failed. Please try again.",
  "Restore impact",
  "Slug changes to /{slug}.",
  "Status changes to {status}.",
  "Revision was marked as homepage.",
  "Revision was not marked as homepage.",
  "Schedule fields change.",
  "Expired schedule dates will be cleared.",
  "Homepage flag was not restored.",
  "Past or invalid schedule dates from the revision were not restored. Set a new schedule if needed.",
  "Revision not found.",
  "Status was adjusted during restore.",
] as const;

const VISIBLE_CONTENT_EDITOR_KEYS = [
  "dashboard.content.createPage",
  "dashboard.content.createBlogPost",
  "dashboard.content.createHeroSlider",
  "dashboard.content.newChoice.title",
  "dashboard.content.newChoice.description",
  "dashboard.content.newChoice.pageTitle",
  "dashboard.content.newChoice.pageDescription",
  "dashboard.content.newChoice.blogPostTitle",
  "dashboard.content.newChoice.blogPostDescription",
  "dashboard.content.newChoice.heroSliderTitle",
  "dashboard.content.newChoice.heroSliderDescription",
  "dashboard.content.newChoice.webshopTitle",
  "dashboard.content.newChoice.webshopDescription",
  "dashboard.content.newChoice.licenseServerTitle",
  "dashboard.content.newChoice.licenseServerDescription",
  "dashboard.content.typeDescription.page",
  "dashboard.content.typeDescription.blog_post",
  "dashboard.content.typeDescription.hero_slider",
  "dashboard.content.form.name",
  "dashboard.content.form.slug",
  "dashboard.content.form.description",
  "dashboard.content.form.descriptionPlaceholder",
  "dashboard.content.form.saveAndClose",
  "dashboard.content.form.sessionSecurity",
  "dashboard.content.form.sessionSecurityDescription",
  "dashboard.content.form.publishing",
  "dashboard.content.form.visibility",
  "dashboard.content.form.category",
  "dashboard.content.form.history",
  "dashboard.content.form.publicUrl",
  "dashboard.content.form.publishAt",
  "dashboard.content.form.unpublishAt",
  "dashboard.content.form.schedulePublish",
  "dashboard.content.form.clearSchedule",
  "dashboard.content.form.public",
  "dashboard.content.form.publicVisibilityHelp",
  "dashboard.content.form.viewerDefaultRole",
  "dashboard.content.form.adminsAlwaysAccess",
] as const;

const CONTENT_EDITOR_ALLOWED_SAME_AS_ENGLISH = new Set([
  "Alt text",
  "Autoplay",
  "Center",
  "Description",
  "Full",
  "Loop",
  "Margin",
  "Name",
  "Overlay",
  "Padding",
  "Public",
  "SEO",
  "Slide",
  "Slides",
  "Slug",
  "Status",
  "Top",
  "Upload",
  "url-slug",
  "desktop",
  "tablet",
  "mobile",
]);

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

  if (key.startsWith("dashboard.contentCategories.")) {
    return { count: 2, name: "News", type: "Page" };
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
  const backendWebshopMenuSources = new Set<string>(
    BACKEND_WEBSHOP_MENU_SOURCE_STRINGS,
  );
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
      const expectedTranslation = backendWebshopMenuSources.has(source)
        ? localizeSourceString(source, localizedCode)
        : translations[source];

      assert.equal(
        localizeSourceString(source, localizedCode),
        expectedTranslation,
        `${localizedCode}:${source}`,
      );
    }

    for (const key of addonShellKeys) {
      const englishLeaf = getMessageLeaf(en, key);

      assert.equal(typeof englishLeaf, "string", `${key} must be a string`);
      const englishSource = englishLeaf as string;

      assert.equal(
        addonShellSources.has(englishSource),
        true,
        `addon shell source missing for ${key}: ${englishLeaf}`,
      );

      const values = sampleValuesForKey(key);
      const expectedTranslation = backendWebshopMenuSources.has(englishSource)
        ? localizeSourceString(englishSource, localizedCode)
        : translations[englishSource];

      assert.equal(
        t(key, values),
        renderTemplate(expectedTranslation, values),
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

test("backend webshop menu labels localize across supported backend languages", async () => {
  const english = createTranslator(en, en, "en");

  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;

    const localizedCode = code as LocalizedLanguage;
    const sourceTranslations: Record<string, string> =
      BACKEND_WEBSHOP_MENU_SOURCE_TRANSLATIONS[localizedCode];

    for (const source of BACKEND_WEBSHOP_MENU_SOURCE_STRINGS) {
      assert.notEqual(
        sourceTranslations[source],
        "",
        `${localizedCode}:${source}`,
      );
      assert.notEqual(
        localizeSourceString(source, localizedCode),
        source,
        `${localizedCode}:${source}`,
      );
    }

    const t = createTranslator(
      await loadMessages(localizedCode),
      en,
      localizedCode,
    );

    for (const key of BACKEND_WEBSHOP_NAV_KEYS) {
      assert.notEqual(t(key), english(key), `${localizedCode}:${key}`);
    }
  }
});

test("webshop admin dashboard labels localize across supported backend languages", () => {
  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;

    const localizedCode = code as LocalizedLanguage;
    const translations: Record<string, string> =
      WEBSHOP_ADMIN_DASHBOARD_SOURCE_TRANSLATIONS[localizedCode];

    for (const source of WEBSHOP_ADMIN_DASHBOARD_SOURCE_STRINGS) {
      assert.notEqual(translations[source], "", `${localizedCode}:${source}`);
      assert.notEqual(
        translations[source],
        source,
        `${localizedCode}:${source}`,
      );
      assert.equal(
        localizeSourceString(source, localizedCode),
        translations[source],
        `${localizedCode}:${source}`,
      );
    }
  }
});

test("content dashboard labels localize across supported backend languages", async () => {
  const english = createTranslator(en, en, "en");
  const fallbackMatches: string[] = [];

  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;

    const localizedCode = code as LocalizedLanguage;
    const translations: Record<string, string> =
      CONTENT_DASHBOARD_SOURCE_TRANSLATIONS[localizedCode];

    for (const source of CONTENT_DASHBOARD_SOURCE_STRINGS) {
      assert.notEqual(translations[source], "", `${localizedCode}:${source}`);
      assert.equal(
        localizeSourceString(source, localizedCode),
        translations[source],
        `${localizedCode}:${source}`,
      );
    }

    for (const source of CONTENT_REASSIGN_SOURCE_STRINGS) {
      assert.notEqual(
        localizeSourceString(source, localizedCode),
        source,
        `${localizedCode}:${source}`,
      );
    }

    for (const source of CONTENT_DELETE_SOURCE_STRINGS) {
      assert.notEqual(
        localizeSourceString(source, localizedCode),
        source,
        `${localizedCode}:${source}`,
      );
    }

    for (const source of CONTENT_PAGINATION_SOURCE_STRINGS) {
      assert.notEqual(
        localizeSourceString(source, localizedCode),
        source,
        `${localizedCode}:${source}`,
      );
    }

    for (const source of CONTENT_HISTORY_SOURCE_STRINGS) {
      assert.notEqual(
        localizeSourceString(source, localizedCode),
        source,
        `${localizedCode}:${source}`,
      );
    }

    const t = createTranslator(
      await loadMessages(localizedCode),
      en,
      localizedCode,
    );

    for (const key of VISIBLE_CONTENT_DASHBOARD_KEYS) {
      const translated = t(key);
      const englishValue = english(key);
      if (translated === englishValue) {
        fallbackMatches.push(`${localizedCode}:${key}:${englishValue}`);
      }
    }
  }

  assert.equal(
    localizeSourceString("Changed by", "sr-Latn"),
    "Promenu napravio",
  );
  assert.equal(
    localizeSourceString("Changed by", "sr-Cyrl"),
    "Промену направио",
  );
  assert.deepEqual(fallbackMatches, []);
});

test("content categories labels localize across supported backend languages", async () => {
  const english = createTranslator(en, en, "en");
  const fallbackMatches: string[] = [];

  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;

    const localizedCode = code as LocalizedLanguage;
    const translations: Record<string, string> =
      CONTENT_CATEGORIES_SOURCE_TRANSLATIONS[localizedCode];

    for (const source of CONTENT_CATEGORIES_SOURCE_STRINGS) {
      assert.notEqual(translations[source], "", `${localizedCode}:${source}`);

      if (
        localizeSourceString(source, localizedCode) === source &&
        !CONTENT_CATEGORIES_ALLOWED_SAME_AS_ENGLISH.has(source)
      ) {
        fallbackMatches.push(`${localizedCode}:source:${source}`);
      }
    }

    const t = createTranslator(
      await loadMessages(localizedCode),
      en,
      localizedCode,
    );

    for (const key of VISIBLE_CONTENT_CATEGORIES_KEYS) {
      const values = sampleValuesForKey(key);
      const englishLeaf = getMessageLeaf(en, key);
      const translated = isPluralMessages(englishLeaf)
        ? t.plural(key, Number(values.count ?? 2), values)
        : t(key, values);
      const englishValue = isPluralMessages(englishLeaf)
        ? english.plural(key, Number(values.count ?? 2), values)
        : english(key, values);

      if (
        translated === englishValue &&
        !CONTENT_CATEGORIES_ALLOWED_SAME_AS_ENGLISH.has(englishValue)
      ) {
        fallbackMatches.push(`${localizedCode}:${key}:${englishValue}`);
      }
    }
  }

  assert.deepEqual(fallbackMatches, []);
});

test("file manager labels localize across supported backend languages", async () => {
  const english = createTranslator(en, en, "en");
  const fallbackMatches: string[] = [];
  const allowedSameAsEnglish = new Set([
    " ({names})",
    " (Nokia 3210)",
    "Document",
    "Documents",
    "Image",
    "Images",
    "Type",
    "Video",
  ]);
  const fileManagerKeys = collectMessageLeafPaths(en.dashboard.files).map(
    (key) => `dashboard.files.${key}`,
  );
  const sharedKeys = [
    "dashboard.common.actions.clear",
    "dashboard.common.actions.copyUrl",
    "dashboard.common.actions.deleteSelected",
    "dashboard.common.actions.loadMore",
    "dashboard.common.actions.move",
    "dashboard.common.actions.moveSelected",
    "dashboard.common.actions.reassignOwner",
    "dashboard.filters.allTypes",
    "dashboard.filters.allUsers",
    "dashboard.filters.type",
    "dashboard.filters.uploadedBy",
    "dashboard.toasts.copiedUrl",
    "dashboard.toasts.copyUrlFailed",
  ];
  const values = {
    count: 2,
    folder: "Assets",
    hint: " Open the product first.",
    limit: "50 MB",
    name: "hero.png",
    nameList: " (Nokia 3210)",
    names: "Nokia 3210",
    reference: "these files",
    size: "80 MB",
    target: "2 files",
    total: 10,
    type: "image/png",
    usages: "Webshop product media",
  };

  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;

    const localizedCode = code as LocalizedLanguage;
    const translations: Record<string, string> =
      FILE_MANAGER_SOURCE_TRANSLATIONS[localizedCode];
    const deleteTranslations: Record<string, string> =
      FILE_MANAGER_DELETE_SOURCE_TRANSLATIONS[localizedCode];

    for (const [sourceStrings, sourceTranslations, label] of [
      [FILE_MANAGER_SOURCE_STRINGS, translations, "fileManager"],
      [
        FILE_MANAGER_DELETE_SOURCE_STRINGS,
        deleteTranslations,
        "fileManagerDelete",
      ],
    ] as const) {
      for (const source of sourceStrings) {
        assert.equal(
          Object.hasOwn(sourceTranslations, source),
          true,
          `${localizedCode}:${source}`,
        );
        assert.notEqual(
          sourceTranslations[source],
          "",
          `${localizedCode}:${source}`,
        );
        assertPlaceholderParity(
          source,
          sourceTranslations[source],
          [label, source],
          localizedCode,
        );
        if (!allowedSameAsEnglish.has(source)) {
          assert.notEqual(
            sourceTranslations[source],
            source,
            `${localizedCode}:${source}`,
          );
        }
      }
    }

    const t = createTranslator(
      await loadMessages(localizedCode),
      en,
      localizedCode,
    );

    for (const key of [...fileManagerKeys, ...sharedKeys]) {
      const englishLeaf = getMessageLeaf(en, key);
      const translated = isPluralMessages(englishLeaf)
        ? t.plural(key, Number(values.count), values)
        : t(key, values);
      const englishValue = isPluralMessages(englishLeaf)
        ? english.plural(key, Number(values.count), values)
        : english(key, values);

      if (
        translated === englishValue &&
        !allowedSameAsEnglish.has(englishValue)
      ) {
        fallbackMatches.push(`${localizedCode}:${key}:${englishValue}`);
      }
    }
  }

  assert.deepEqual(fallbackMatches, []);
});

test("gallery manager labels localize across supported backend languages", () => {
  const fallbackMatches: string[] = [];

  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;

    const localizedCode = code as LocalizedLanguage;
    const translations: Record<string, string> =
      GALLERY_MANAGER_SOURCE_TRANSLATIONS[localizedCode];

    assert.equal(
      Object.keys(translations).length,
      GALLERY_MANAGER_SOURCE_STRINGS.length,
      localizedCode,
    );

    for (const source of GALLERY_MANAGER_SOURCE_STRINGS) {
      assert.notEqual(translations[source], "", `${localizedCode}:${source}`);

      if (localizeSourceString(source, localizedCode) === source) {
        fallbackMatches.push(`${localizedCode}:source:${source}`);
      }
    }
  }

  assert.deepEqual(fallbackMatches, []);
});

test("user management labels localize across supported backend languages", async () => {
  const english = createTranslator(en, en, "en");
  const fallbackMatches: string[] = [];
  const userManagementKeys = [
    "dashboard.users.title",
    "dashboard.users.description",
    "dashboard.users.detailsTitle",
    "dashboard.users.backToUsers",
    "dashboard.users.noUsers",
    "dashboard.users.searchPlaceholder",
    "dashboard.users.status.active",
    "dashboard.users.status.locked",
    "dashboard.users.presence.online",
    "dashboard.users.presence.offline",
    "dashboard.users.roles.viewer",
    "dashboard.users.roles.author",
    "dashboard.users.roles.publisher",
    "dashboard.users.roles.admin",
    "dashboard.users.roles.viewerDescription",
    "dashboard.users.roles.authorDescription",
    "dashboard.users.roles.publisherDescription",
    "dashboard.users.roles.adminDescription",
    "dashboard.users.editRoles",
    "dashboard.users.editRolesTitle",
    "dashboard.users.editRolesDescription",
    "dashboard.users.forceLogout",
    "dashboard.users.forceLogoutTitle",
    "dashboard.users.forceLogoutDescription",
    "dashboard.users.lockUser",
    "dashboard.users.unlockUser",
    "dashboard.users.lockTitle",
    "dashboard.users.unlockTitle",
    "dashboard.users.lockDescription",
    "dashboard.users.unlockDescription",
    "dashboard.users.lock",
    "dashboard.users.unlock",
    "dashboard.users.deleteUser",
    "dashboard.users.deleteTitle",
    "dashboard.users.deleteDescription",
    "dashboard.users.labels.username",
    "dashboard.users.labels.email",
    "dashboard.users.labels.memberSince",
    "dashboard.users.labels.status",
    "dashboard.users.labels.presence",
    "dashboard.users.labels.roles",
    "dashboard.users.errors.invalidUserId",
    "dashboard.users.errors.cannotLockSelf",
    "dashboard.users.errors.cannotForceSignOutSelf",
    "dashboard.users.errors.revokeSessionsFailed",
    "dashboard.users.errors.cannotDeleteSelf",
    "dashboard.users.errors.loadUsersFailed",
  ] as const;

  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;

    const localizedCode = code as LocalizedLanguage;
    const translations: Record<string, string> =
      USER_MANAGEMENT_SOURCE_TRANSLATIONS[localizedCode];

    assert.equal(
      Object.keys(translations).length,
      USER_MANAGEMENT_SOURCE_STRINGS.length,
      localizedCode,
    );

    for (const source of USER_MANAGEMENT_SOURCE_STRINGS) {
      assert.notEqual(translations[source], "", `${localizedCode}:${source}`);
      if (translations[source] === source) {
        fallbackMatches.push(`${localizedCode}:source:${source}`);
      }
    }

    const t = createTranslator(
      await loadMessages(localizedCode),
      en,
      localizedCode,
    );

    for (const key of userManagementKeys) {
      const translated = t(key);
      const englishValue = english(key);

      if (translated === englishValue) {
        fallbackMatches.push(`${localizedCode}:${key}:${englishValue}`);
      }
    }
  }

  assert.deepEqual(fallbackMatches, []);
});

test("menu management labels localize across supported backend languages", async () => {
  const english = createTranslator(en, en, "en");
  const fallbackMatches: string[] = [];
  const menuManagementKeys = [
    "dashboard.menus.description",
    "dashboard.menus.searchPlaceholder",
    "dashboard.menus.noMenus",
    "dashboard.menus.create",
    "dashboard.menus.createTitle",
    "dashboard.menus.createDescription",
    "dashboard.menus.menuName",
    "dashboard.menus.renameTitle",
    "dashboard.menus.reassignTitle",
    "dashboard.menus.reassignDescription",
    "dashboard.menus.deleteTitle",
    "dashboard.menus.deleteDescription",
    "dashboard.menus.deleteHeaderMenuTitle",
    "dashboard.menus.deleteHeaderMenuDescription",
    "dashboard.menus.editorDescription",
    "dashboard.menus.contentPicker.searchPlaceholder",
    "dashboard.menus.contentPicker.empty",
    "dashboard.menus.builder.menuStructure",
    "dashboard.menus.builder.empty",
    "dashboard.menus.builder.help",
    "dashboard.menus.builder.menuItem",
    "dashboard.menus.customLink.add",
    "dashboard.menus.customLink.addDescription",
    "dashboard.menus.customLink.edit",
    "dashboard.menus.customLink.editDescription",
    "dashboard.menus.customLink.linkedDescription",
    "dashboard.menus.customLink.labelRequired",
    "dashboard.menus.customLink.labelPlaceholder",
    "dashboard.menus.customLink.urlRequired",
    "dashboard.menus.customLink.invalidUrl",
    "dashboard.menus.customLink.openIn",
    "dashboard.menus.target.sameTab",
    "dashboard.menus.target.newTab",
    "dashboard.common.actions.backToMenus",
    "dashboard.common.actions.reassign",
    "dashboard.common.table.creator",
    "dashboard.common.table.nested",
    "dashboard.filters.allCreators",
  ] as const;

  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;

    const localizedCode = code as LocalizedLanguage;
    const translations: Record<string, string> =
      MENU_MANAGEMENT_SOURCE_TRANSLATIONS[localizedCode];

    assert.equal(
      Object.keys(translations).length >= MENU_MANAGEMENT_SOURCE_STRINGS.length,
      true,
      localizedCode,
    );

    for (const source of MENU_MANAGEMENT_SOURCE_STRINGS) {
      assert.notEqual(translations[source], "", `${localizedCode}:${source}`);
      if (localizeSourceString(source, localizedCode) === source) {
        fallbackMatches.push(`${localizedCode}:source:${source}`);
      }
    }

    const t = createTranslator(
      await loadMessages(localizedCode),
      en,
      localizedCode,
    );

    for (const key of menuManagementKeys) {
      const translated = t(key, { name: "Main Menu" });
      const englishValue = english(key, { name: "Main Menu" });

      if (translated === englishValue) {
        fallbackMatches.push(`${localizedCode}:${key}:${englishValue}`);
      }
    }
  }

  assert.deepEqual(fallbackMatches, []);
});

test("form builder labels localize across supported backend languages", async () => {
  const english = createTranslator(en, en, "en");
  const fallbackMatches: string[] = [];
  const allowedSameAsEnglish = new Set([
    "Date",
    "Dropdown",
    "General",
    "Name",
    "Status",
  ]);
  const formBuilderKeys = collectMessageLeafPaths(en.dashboard.forms).map(
    (key) => `dashboard.forms.${key}`,
  );

  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;

    const localizedCode = code as LocalizedLanguage;
    const translations: Record<string, string> =
      FORM_BUILDER_SOURCE_TRANSLATIONS[localizedCode];

    assert.equal(
      Object.keys(translations).length,
      FORM_BUILDER_SOURCE_STRINGS.length,
      localizedCode,
    );

    for (const source of FORM_BUILDER_SOURCE_STRINGS) {
      assert.notEqual(translations[source], "", `${localizedCode}:${source}`);
      assertPlaceholderParity(
        source,
        translations[source],
        ["formBuilder", source],
        localizedCode,
      );
      if (
        translations[source] === source &&
        !allowedSameAsEnglish.has(source)
      ) {
        fallbackMatches.push(`${localizedCode}:source:${source}`);
      }
    }

    const t = createTranslator(
      await loadMessages(localizedCode),
      en,
      localizedCode,
    );

    for (const key of formBuilderKeys) {
      const values = {
        count: 2,
        key: "field_key",
        name: "Contact",
        time: "12:30",
      };
      const translated = t(key, values);
      const englishValue = english(key, values);

      if (
        translated === englishValue &&
        !allowedSameAsEnglish.has(englishValue)
      ) {
        fallbackMatches.push(`${localizedCode}:${key}:${englishValue}`);
      }
    }

    const pluralTranslated = t.plural("dashboard.forms.totalSubmissions", 2);
    const pluralEnglish = english.plural("dashboard.forms.totalSubmissions", 2);
    if (pluralTranslated === pluralEnglish) {
      fallbackMatches.push(`${localizedCode}:dashboard.forms.totalSubmissions`);
    }
  }

  assert.deepEqual(fallbackMatches, []);
});

test("content create and editor labels localize across supported backend languages", async () => {
  const english = createTranslator(en, en, "en");
  const fallbackMatches: string[] = [];

  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;

    const localizedCode = code as LocalizedLanguage;
    const translations: Record<string, string> =
      CONTENT_EDITOR_SOURCE_TRANSLATIONS[localizedCode];
    const additionalTranslations: Record<string, string> =
      CONTENT_EDITOR_ADDITIONAL_SOURCE_TRANSLATIONS[localizedCode] ?? {};
    const newChoiceTranslations: Record<string, string> =
      CONTENT_NEW_CHOICE_SOURCE_TRANSLATIONS[localizedCode];

    for (const source of CONTENT_EDITOR_SOURCE_STRINGS) {
      assert.notEqual(translations[source], "", `${localizedCode}:${source}`);
      const translatedSource = localizeSourceString(source, localizedCode);
      assert.notEqual(translatedSource, "", `${localizedCode}:${source}`);
      if (!CONTENT_EDITOR_ALLOWED_SAME_AS_ENGLISH.has(source)) {
        assert.notEqual(translatedSource, source, `${localizedCode}:${source}`);
      }
    }

    for (const source of CONTENT_EDITOR_DIALOG_SOURCE_STRINGS) {
      assert.notEqual(
        additionalTranslations[source],
        "",
        `${localizedCode}:${source}`,
      );
      assert.notEqual(
        additionalTranslations[source],
        source,
        `${localizedCode}:${source}`,
      );
      assert.equal(
        localizeSourceString(source, localizedCode),
        additionalTranslations[source],
        `${localizedCode}:${source}`,
      );
    }

    for (const source of CONTENT_NEW_CHOICE_SOURCE_STRINGS) {
      assert.notEqual(
        newChoiceTranslations[source],
        "",
        `${localizedCode}:${source}`,
      );
      assert.notEqual(
        newChoiceTranslations[source],
        source,
        `${localizedCode}:${source}`,
      );
      assert.equal(
        localizeSourceString(source, localizedCode),
        newChoiceTranslations[source],
        `${localizedCode}:${source}`,
      );
    }

    const t = createTranslator(
      await loadMessages(localizedCode),
      en,
      localizedCode,
    );

    for (const key of VISIBLE_CONTENT_EDITOR_KEYS) {
      const values = sampleValuesForKey(key);
      const translated = t(key, values);
      const englishValue = english(key, values);
      if (
        translated === englishValue &&
        !CONTENT_EDITOR_ALLOWED_SAME_AS_ENGLISH.has(englishValue)
      ) {
        fallbackMatches.push(`${localizedCode}:${key}:${englishValue}`);
      }
    }
  }

  assert.equal(localizeSourceString("Edit image", "sr-Cyrl"), "Уреди слику");
  assert.equal(
    localizeSourceString("Insert gallery", "sr-Cyrl"),
    "Уметни галерију",
  );
  assert.equal(
    localizeSourceString("Search galleries…", "sr-Cyrl"),
    "Претражи галерије…",
  );
  assert.equal(localizeSourceString("Insert", "sr-Cyrl"), "Уметни");
  assert.match(
    localizeSourceString(
      "Pick an existing gallery from the Gallery Manager. Its images will render as a responsive thumbnail grid in the post.",
      "sr-Cyrl",
    ),
    /^Изабери постојећу галерију/,
  );
  assert.deepEqual(fallbackMatches, []);
});

test("page builder chrome labels localize across supported backend languages", () => {
  const exactPageBuilderSources = new Set<string>([
    "AI assistant",
    "Provider:",
    "Model:",
    "Add blocks",
    "Root",
    "Inspector",
    "Properties",
    "Select a block to edit its properties.",
    "Expand settings sidebar",
    "No settings available.",
    "RawHtml",
    "Spacing",
    "Layout",
    "Borders & Effects",
    "Responsive",
    "Animation",
    "Selected image",
    "Image selected",
    "No image selected.",
    "Change Image",
    "Choose Image",
    "Clear selection",
    "Background image",
    "No image",
    "Border style",
    "Default",
    "Unset",
    "Solid",
    "Dashed",
    "Dotted",
    "Hide on desktop",
    "Hide on tablet",
    "Hide on mobile",
    "Toggle visibility per viewport. Other responsive overrides are set by switching the tabs at the top of the Settings panel and editing sections — those edits apply only to the active viewport.",
    "Slide up",
    "Slide down",
    "Slide left",
    "Slide right",
    "Animations honor user reduced-motion preferences.",
    "Animation is configured globally — switch to the Desktop tab to edit.",
    "Font family",
    "Size",
    "Weight",
    "Align",
    "Center",
    "Justify",
    "UPPER",
    "lower",
    "Style",
    "Normal",
    "Italic",
    "Decoration",
    "Underline",
    "Line-through",
    "Text color",
    "Background color",
    "Margin",
    "Padding",
    "Min height",
    "Display",
    "Block",
    "Inline-block",
    "Flex",
    "Inline-flex",
    "Grid",
    "Direction",
    "Row",
    "Row reverse",
    "Column reverse",
    "Align items",
    "Stretch",
    "Start",
    "End",
    "Baseline",
    "Space between",
    "Space around",
    "Space evenly",
    "Overflow",
    "Visible",
    "Auto",
    "Scroll",
    "Z-index",
    "XS",
    "SM",
    "MD",
    "LG",
    "Custom…",
    "Choose color",
    "Pick color",
    "Pick custom color",
    "Unlink sides",
    "Link all sides",
    "Cover",
    "Contain",
    "Repeat",
    "No repeat",
    "Repeat-X",
    "Repeat-Y",
    "Top",
    "Inherited from desktop",
  ]);
  const nonEnglishBlockSettingsSources = new Set<string>([
    "Selected image",
    "Image selected",
    "No image selected.",
    "Change Image",
    "Choose Image",
    "Clear selection",
    "Background image",
    "No image",
    "Border style",
    "Default",
    "Unset",
    "Solid",
    "Dashed",
    "Dotted",
    "Hide on desktop",
    "Hide on tablet",
    "Hide on mobile",
    "Toggle visibility per viewport. Other responsive overrides are set by switching the tabs at the top of the Settings panel and editing sections — those edits apply only to the active viewport.",
    "Slide up",
    "Slide down",
    "Slide left",
    "Slide right",
    "Animations honor user reduced-motion preferences.",
    "Animation is configured globally — switch to the Desktop tab to edit.",
  ]);

  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;

    const localizedCode = code as LocalizedLanguage;
    const translations: Record<string, string> =
      PAGE_BUILDER_SOURCE_TRANSLATIONS[localizedCode];

    for (const source of PAGE_BUILDER_SOURCE_STRINGS) {
      assert.notEqual(translations[source], "", `${localizedCode}:${source}`);
      const localizedSource = localizeSourceString(source, localizedCode);
      assert.notEqual(localizedSource, "", `${localizedCode}:${source}`);
      if (exactPageBuilderSources.has(source)) {
        assert.equal(
          localizedSource,
          translations[source],
          `${localizedCode}:${source}`,
        );
      }
      if (nonEnglishBlockSettingsSources.has(source)) {
        assert.notEqual(localizedSource, source, `${localizedCode}:${source}`);
      }
    }
  }

  assert.equal(localizeSourceString("Root", "sr-Cyrl"), "Корен");
  assert.equal(localizeSourceString("Inspector", "sr-Cyrl"), "Инспектор");
  assert.equal(
    localizeSourceString("Select a block to edit its properties.", "sr-Cyrl"),
    "Изабери блок да уредиш његова својства.",
  );
  assert.equal(localizeSourceString("Spacing", "sr-Cyrl"), "Размаци");
  assert.equal(localizeSourceString("Layout", "sr-Cyrl"), "Распоред");
  assert.equal(
    localizeSourceString("Borders & Effects", "sr-Cyrl"),
    "Ивице и ефекти",
  );
  assert.equal(localizeSourceString("Responsive", "sr-Cyrl"), "Респонсивно");
  assert.equal(localizeSourceString("Animation", "sr-Cyrl"), "Анимација");
  assert.equal(
    localizeSourceString("Selected image", "sr-Cyrl"),
    "Изабрана слика",
  );
  assert.equal(
    localizeSourceString("Change Image", "sr-Cyrl"),
    "Промени слику",
  );
  assert.equal(
    localizeSourceString("Clear selection", "sr-Cyrl"),
    "Обриши избор",
  );
  assert.equal(
    localizeSourceString("Background image", "sr-Cyrl"),
    "Слика позадине",
  );
  assert.equal(localizeSourceString("Border style", "sr-Cyrl"), "Стил ивице");
  assert.equal(localizeSourceString("Solid", "sr-Cyrl"), "Пуна");
  assert.equal(localizeSourceString("Dashed", "sr-Cyrl"), "Испрекидана");
  assert.equal(localizeSourceString("Dotted", "sr-Cyrl"), "Тачкаста");
  assert.equal(
    localizeSourceString("Hide on mobile", "sr-Cyrl"),
    "Сакриј на мобилном",
  );
  assert.equal(localizeSourceString("Slide up", "sr-Cyrl"), "Клизање нагоре");
  assert.equal(
    localizeSourceString("Slide right", "sr-Cyrl"),
    "Клизање удесно",
  );
  assert.match(
    localizeSourceString(
      "Toggle visibility per viewport. Other responsive overrides are set by switching the tabs at the top of the Settings panel and editing sections — those edits apply only to the active viewport.",
      "sr-Cyrl",
    ),
    /^Укључи\/искључи/u,
  );
  assert.equal(
    localizeSourceString("Font family", "sr-Cyrl"),
    "Породица фонта",
  );
  assert.equal(localizeSourceString("UPPER", "sr-Cyrl"), "ВЕЛИКА");
  assert.equal(localizeSourceString("Display", "sr-Cyrl"), "Приказ");
  assert.equal(localizeSourceString("Block", "sr-Cyrl"), "Блок");
  assert.equal(localizeSourceString("Repeat-X", "sr-Cyrl"), "Понављај X");
  assert.equal(
    localizeSourceString("Inherited from desktop", "sr-Cyrl"),
    "Наслеђено са десктопа",
  );
});

test("hero slider create and edit labels localize across supported languages", () => {
  const allowedSameAsEnglish = new Set(["HTML", "URL", "Z-index"]);

  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;
    const language = code as LocalizedLanguage;
    const translations: Record<string, string> =
      HERO_SLIDER_SOURCE_TRANSLATIONS[language] ?? {};
    assert.equal(
      Object.keys(translations).length,
      HERO_SLIDER_SOURCE_STRINGS.length,
      language,
    );

    for (const source of HERO_SLIDER_SOURCE_STRINGS) {
      assert.notEqual(translations[source], "", `${language}:${source}`);
      const localizedSource = localizeSourceString(source, language);
      assert.equal(
        localizedSource,
        translations[source],
        `${language}:${source}`,
      );
    }
    assert.notEqual(localizeSourceString("Fade", language), "Fade", language);
  }

  for (const source of HERO_SLIDER_SOURCE_STRINGS) {
    if (allowedSameAsEnglish.has(source)) continue;
    assert.notEqual(
      localizeSourceString(source, "sr-Cyrl"),
      source,
      `sr-Cyrl:${source}`,
    );
  }

  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;
    const language = code as LocalizedLanguage;
    const localize = (source: string) => localizeSourceString(source, language);
    const defaultSlider = createDefaultHeroSlider(localize);
    const serialized = JSON.stringify(defaultSlider);

    for (const englishSeed of [
      "Build the hero your page deserves",
      "Create rich slide layouts with media, layered overlays, CTAs, cards, and responsive controls.",
      "Get started",
      "Learn more",
      "Hero slider",
    ]) {
      assert.equal(
        serialized.includes(englishSeed),
        false,
        `${language}:${englishSeed}`,
      );
    }
  }

  const localizeSerbian = (source: string) =>
    localizeSourceString(source, "sr-Cyrl");
  const defaultSlider = createDefaultHeroSlider(localizeSerbian);
  const serialized = JSON.stringify(defaultSlider);

  for (const englishSeed of [
    "Build the hero your page deserves",
    "Create rich slide layouts with media, layered overlays, CTAs, cards, and responsive controls.",
    "Get started",
    "Learn more",
    "Hero slider",
  ]) {
    assert.equal(serialized.includes(englishSeed), false, englishSeed);
  }

  assert.equal(serialized.includes("Направи херо"), true);
  assert.equal(serialized.includes("Почни"), true);
});

test("global settings labels localize across supported backend languages", async () => {
  const english = createTranslator(en, en, "en");
  const globalSettingsKeys = collectMessageLeafPaths(en.globalSettings).map(
    (key) => `globalSettings.${key}`,
  );
  const presetCatalogSources = new Set<string>();
  for (const preset of APPEARANCE_SHELL_PRESETS) {
    presetCatalogSources.add(preset.name);
    presetCatalogSources.add(preset.description);
    for (const tag of preset.tags) {
      presetCatalogSources.add(tag);
    }
  }
  const fallbackMatches: string[] = [];

  for (const { code } of SUPPORTED_CMS_LANGUAGES) {
    if (code === "en") continue;

    const localizedCode = code as LocalizedLanguage;
    const translations: Record<string, string> =
      GLOBAL_SETTINGS_SOURCE_TRANSLATIONS[localizedCode];
    const controlTranslations: Record<string, string> =
      GLOBAL_SETTINGS_CONTROL_SOURCE_TRANSLATIONS[localizedCode];
    const appearanceTranslations: Record<string, string> =
      GLOBAL_SETTINGS_APPEARANCE_SOURCE_TRANSLATIONS[localizedCode];
    const optionTranslations: Record<string, string> =
      GLOBAL_SETTINGS_OPTION_SOURCE_TRANSLATIONS[localizedCode];
    const presetTranslations: Record<string, string> =
      GLOBAL_SETTINGS_PRESET_SOURCE_TRANSLATIONS[localizedCode];
    const sessionTranslations: Record<string, string> =
      GLOBAL_SETTINGS_SESSION_SOURCE_TRANSLATIONS[localizedCode];
    const formTranslations: Record<string, string> =
      GLOBAL_SETTINGS_FORM_SOURCE_TRANSLATIONS[localizedCode];
    const helpTranslations: Record<string, string> =
      GLOBAL_SETTINGS_HELP_SOURCE_TRANSLATIONS[localizedCode];

    for (const source of GLOBAL_SETTINGS_SOURCE_STRINGS) {
      assert.equal(
        localizeSourceString(source, localizedCode),
        translations[source],
        `${localizedCode}:${source}`,
      );
      assert.notEqual(translations[source], "", `${localizedCode}:${source}`);
    }

    for (const source of GLOBAL_SETTINGS_CONTROL_SOURCE_STRINGS) {
      const translated = localizeSourceString(source, localizedCode);
      assert.notEqual(translated, "", `${localizedCode}:${source}`);
      assert.notEqual(translated, source, `${localizedCode}:${source}`);
      assert.notEqual(
        controlTranslations[source],
        "",
        `${localizedCode}:${source}`,
      );
      assert.notEqual(
        controlTranslations[source],
        source,
        `${localizedCode}:${source}`,
      );
    }

    for (const source of GLOBAL_SETTINGS_APPEARANCE_SOURCE_STRINGS) {
      assert.notEqual(
        appearanceTranslations[source],
        "",
        `${localizedCode}:${source}`,
      );
      assert.notEqual(
        localizeSourceString(source, localizedCode),
        "",
        `${localizedCode}:${source}`,
      );
    }

    for (const source of GLOBAL_SETTINGS_OPTION_SOURCE_STRINGS) {
      assert.notEqual(
        optionTranslations[source],
        "",
        `${localizedCode}:${source}`,
      );
      assert.notEqual(
        localizeSourceString(source, localizedCode),
        "",
        `${localizedCode}:${source}`,
      );
    }

    for (const source of GLOBAL_SETTINGS_PRESET_SOURCE_STRINGS) {
      assert.equal(
        Object.hasOwn(presetTranslations, source),
        true,
        `${localizedCode}:${source}`,
      );
      assert.notEqual(
        presetTranslations[source],
        "",
        `${localizedCode}:${source}`,
      );
      assert.equal(
        localizeSourceString(source, localizedCode),
        presetTranslations[source],
        `${localizedCode}:${source}`,
      );
    }

    for (const source of presetCatalogSources) {
      assert.equal(
        GLOBAL_SETTINGS_PRESET_SOURCE_STRINGS.includes(
          source as (typeof GLOBAL_SETTINGS_PRESET_SOURCE_STRINGS)[number],
        ),
        true,
        `preset source missing from global settings preset translations: ${source}`,
      );
      assert.equal(
        localizeSourceString(source, localizedCode),
        presetTranslations[source],
        `${localizedCode}:${source}`,
      );
    }

    assert.equal(
      localizeSourceString("Cyber Journal", "sr-Latn"),
      "Sajber žurnal",
    );
    assert.equal(localizeSourceString("cyberpunk", "sr-Latn"), "sajberpank");
    assert.equal(localizeSourceString("journal", "sr-Latn"), "žurnal");
    assert.equal(localizeSourceString("magazine", "sr-Latn"), "magazin");
    assert.equal(localizeSourceString("Top", "sr-Cyrl"), "Врх");
    assert.equal(localizeSourceString("Hero", "sr-Cyrl"), "Херо секција");
    assert.equal(localizeSourceString("Lead", "sr-Cyrl"), "Уводно");
    assert.equal(
      localizeSourceString("After Content", "sr-Cyrl"),
      "После садржаја",
    );
    assert.equal(
      localizeSourceString("Footer Actions", "sr-Cyrl"),
      "Акције у подножју",
    );

    assert.equal(
      localizeSourceString("Full-bleed Builder", "el"),
      "Builder πλήρους πλάτους",
    );
    assert.equal(localizeSourceString("Small", "el"), "Μικρό");
    assert.equal(localizeSourceString("Soft", "el"), "Απαλό");
    assert.equal(
      localizeSourceString(
        "Reasoning model: hidden reasoning may use output tokens. Keep the token cap low and watch billing.",
        "el",
      ),
      "Μοντέλο συλλογιστικής: η κρυφή συλλογιστική μπορεί να χρησιμοποιεί output tokens. Κρατήστε χαμηλό το όριο token και παρακολουθήστε τη χρέωση.",
    );

    for (const source of GLOBAL_SETTINGS_SESSION_SOURCE_STRINGS) {
      assert.notEqual(
        sessionTranslations[source],
        "",
        `${localizedCode}:${source}`,
      );
      assert.notEqual(
        sessionTranslations[source],
        source,
        `${localizedCode}:${source}`,
      );
      assert.notEqual(
        localizeSourceString(source, localizedCode),
        source,
        `${localizedCode}:${source}`,
      );
    }

    for (const source of GLOBAL_SETTINGS_FORM_SOURCE_STRINGS) {
      assert.notEqual(
        formTranslations[source],
        "",
        `${localizedCode}:${source}`,
      );
      assert.notEqual(
        localizeSourceString(source, localizedCode),
        "",
        `${localizedCode}:${source}`,
      );
    }

    for (const source of GLOBAL_SETTINGS_HELP_SOURCE_STRINGS) {
      assert.notEqual(
        helpTranslations[source],
        "",
        `${localizedCode}:${source}`,
      );
      assert.notEqual(
        helpTranslations[source],
        "Configure this option for CMS.",
        `${localizedCode}:${source}`,
      );
      assert.notEqual(
        helpTranslations[source],
        "Подеси ову опцију за CMS.",
        `${localizedCode}:${source}`,
      );
      assert.equal(
        localizeSourceString(source, localizedCode),
        helpTranslations[source],
        `${localizedCode}:${source}`,
      );
    }

    assert.equal(
      localizeSourceString(
        "Presets update the draft recipe while keeping identity, menus, and content.",
        "sr-Cyrl",
      ),
      "Пресети ажурирају нацрт рецепта, а задржавају идентитет, меније и садржај.",
    );
    assert.equal(
      localizeSourceString(
        "Global template selections for public content surfaces.",
        "sr-Cyrl",
      ),
      "Глобални избори шаблона за јавне површине садржаја.",
    );
    assert.equal(
      localizeSourceString(
        "Controls the visibility of the AI Writing Assistant UI.",
        "sr-Cyrl",
      ),
      "Контролише видљивост UI-ја AI асистента за писање.",
    );

    const t = createTranslator(
      await loadMessages(localizedCode),
      en,
      localizedCode,
    );

    assert.equal(t("globalSettings.tabs.ai"), "AI", `${localizedCode}:AI tab`);

    for (const key of globalSettingsKeys) {
      const translated = t(key);
      const englishValue = english(key);
      if (
        translated === englishValue &&
        !GLOBAL_SETTINGS_ALLOWED_SAME_AS_ENGLISH.has(englishValue)
      ) {
        fallbackMatches.push(`${localizedCode}:${key}:${englishValue}`);
      }
    }
  }

  assert.deepEqual(fallbackMatches, []);
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
