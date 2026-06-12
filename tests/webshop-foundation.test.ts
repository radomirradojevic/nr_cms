import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { WebshopPublicPlaceholder } from "@/components/webshop-public-placeholder";
import { canCreateContentType } from "@/lib/content-type-permissions";
import {
  CMS_CONTENT_TYPES,
  WEBSHOP_SYSTEM_CATEGORY_NAME,
  categoryTypeForContentType,
  isContentType,
} from "@/lib/content-types";
import { canEditContent } from "@/lib/content-locks";
import { canAccessContentPreview } from "@/lib/content-preview-auth";
import { HeaderSettingsSchema } from "@/lib/global-settings";
import {
  resolveShellRenderTargetForPathname,
  shouldShowShellForTarget,
} from "@/lib/shell-visibility-targets";
import type { Role } from "@/lib/roles";

const admin: Role[] = ["admin"];
const author: Role[] = ["author"];
const publisher: Role[] = ["publisher"];

test("content type validation includes webshop", () => {
  assert.equal(CMS_CONTENT_TYPES.includes("webshop"), true);
  assert.equal(isContentType("webshop"), true);
  assert.equal(categoryTypeForContentType("webshop"), "webshop");
  assert.equal(WEBSHOP_SYSTEM_CATEGORY_NAME, "Webshop");
});

test("only admins can create webshop content", () => {
  assert.equal(canCreateContentType(admin, "webshop"), true);
  assert.equal(canCreateContentType(author, "webshop"), false);
  assert.equal(canCreateContentType(publisher, "webshop"), false);
  assert.equal(canCreateContentType(author, "page"), true);
});

test("webshop edit locks are admin-only", () => {
  const target = {
    authorId: "author_1",
    contentType: "webshop",
    status: "draft",
  } as const;

  assert.equal(
    canEditContent({ userId: "author_1", roles: author }, target),
    false,
  );
  assert.equal(
    canEditContent({ userId: "publisher_1", roles: publisher }, target, author),
    false,
  );
  assert.equal(
    canEditContent({ userId: "admin_1", roles: admin }, target),
    true,
  );
});

test("webshop preview tokens are admin-only", () => {
  assert.equal(
    canAccessContentPreview({
      actorRoles: author,
      actorUserId: "author_1",
      targetAuthorId: "author_1",
      targetContentType: "webshop",
      targetStatus: "draft",
    }),
    false,
  );
  assert.equal(
    canAccessContentPreview({
      actorRoles: admin,
      actorUserId: "admin_1",
      targetAuthorId: "author_1",
      targetContentType: "webshop",
      targetStatus: "draft",
    }),
    true,
  );
});

test("selected shell visibility can target webshop content", () => {
  const webshopId = "55555555-5555-4555-8555-555555555555";
  const visibility = HeaderSettingsSchema.parse({
    visibility: {
      mode: "selected",
      targets: {
        webshopIds: [webshopId],
      },
    },
  }).visibility;

  assert.equal(
    shouldShowShellForTarget(visibility, {
      contentId: webshopId,
      contentType: "webshop",
    }),
    true,
  );
  assert.equal(
    shouldShowShellForTarget(visibility, {
      contentId: webshopId,
      contentType: "page",
    }),
    false,
  );
});

test("route index resolves webshop slug navigation", () => {
  const webshopId = "66666666-6666-4666-8666-666666666666";
  const target = resolveShellRenderTargetForPathname("/shop", {
    homepage: null,
    contents: [
      {
        slug: "shop",
        contentId: webshopId,
        contentType: "webshop",
      },
    ],
    blogCategoryIds: [],
  });

  assert.deepEqual(target, { contentId: webshopId, contentType: "webshop" });
});

test("route index resolves nested public webshop routes to the webshop", () => {
  const webshopId = "77777777-7777-4777-8777-777777777777";
  const routeIndex = {
    homepage: null,
    contents: [
      {
        slug: "shop",
        contentId: webshopId,
        contentType: "webshop" as const,
      },
      {
        slug: "about",
        contentId: "88888888-8888-4888-8888-888888888888",
        contentType: "page" as const,
      },
    ],
    blogCategoryIds: [],
  };

  assert.deepEqual(
    resolveShellRenderTargetForPathname("/shop/p/samsung-a56", routeIndex),
    { contentId: webshopId, contentType: "webshop" },
  );
  assert.deepEqual(
    resolveShellRenderTargetForPathname("/shop/wishlist", routeIndex),
    { contentId: webshopId, contentType: "webshop" },
  );
  assert.deepEqual(
    resolveShellRenderTargetForPathname("/about/team", routeIndex),
    {},
  );
});

test("webshop public placeholder renders stable markup", () => {
  const html = renderToStaticMarkup(
    createElement(WebshopPublicPlaceholder, {
      title: "Shop",
      description: "Public storefront shell.",
    }),
  );

  assert.match(html, /Webshop/);
  assert.match(html, /Shop/);
  assert.match(html, /Public storefront shell\./);
});
