import assert from "node:assert/strict";
import test from "node:test";

import { HeaderSettingsSchema } from "@/lib/global-settings";
import {
  resolveShellRenderTargetForPathname,
  shouldShowShellForTarget,
} from "@/lib/shell-visibility-targets";

test("header settings default shell visibility to show everywhere", () => {
  const parsed = HeaderSettingsSchema.parse({});

  assert.equal(parsed.visibility.mode, "everywhere");
  assert.equal(
    shouldShowShellForTarget(parsed.visibility, {
      contentId: "11111111-1111-4111-8111-111111111111",
      contentType: "page",
    }),
    true,
  );
});

test("selected shell visibility matches stable target ids", () => {
  const pageId = "11111111-1111-4111-8111-111111111111";
  const postId = "22222222-2222-4222-8222-222222222222";
  const visibility = HeaderSettingsSchema.parse({
    visibility: {
      mode: "selected",
      targets: {
        pageIds: [pageId],
        blogPostIds: [postId],
        adminPageIds: ["content"],
      },
    },
  }).visibility;

  assert.equal(
    shouldShowShellForTarget(visibility, {
      contentId: pageId,
      contentType: "page",
    }),
    true,
  );
  assert.equal(
    shouldShowShellForTarget(visibility, {
      contentId: postId,
      contentType: "page",
    }),
    false,
  );
  assert.equal(
    shouldShowShellForTarget(visibility, { adminPageId: "content" }),
    true,
  );
  assert.equal(shouldShowShellForTarget(visibility, {}), false);
});

test("route index resolves slug navigation to stable content ids", () => {
  const homeId = "33333333-3333-4333-8333-333333333333";
  const target = resolveShellRenderTargetForPathname("/home", {
    homepage: null,
    contents: [{ slug: "home", contentId: homeId, contentType: "page" }],
    blogCategoryIds: [],
  });

  assert.deepEqual(target, { contentId: homeId, contentType: "page" });
});
