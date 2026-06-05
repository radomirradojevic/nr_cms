import test from "node:test";
import assert from "node:assert/strict";

import { canCreateContentPreviewToken } from "@/lib/content-preview-auth";
import type { Role } from "@/lib/roles";

const admin: Role[] = ["admin"];
const author: Role[] = ["author"];
const publisher: Role[] = ["publisher"];

test("admin can create preview token for non-archived content", () => {
  assert.equal(
    canCreateContentPreviewToken({
      actorRoles: admin,
      actorUserId: "admin_1",
      targetAuthorId: "author_1",
      targetStatus: "draft",
    }),
    true,
  );
});

test("author can create preview token for own content only", () => {
  assert.equal(
    canCreateContentPreviewToken({
      actorRoles: author,
      actorUserId: "author_1",
      targetAuthorId: "author_1",
      targetStatus: "in_review",
    }),
    true,
  );
  assert.equal(
    canCreateContentPreviewToken({
      actorRoles: author,
      actorUserId: "author_1",
      targetAuthorId: "author_2",
      targetStatus: "draft",
    }),
    false,
  );
});

test("publisher can create preview token for author-owned content", () => {
  assert.equal(
    canCreateContentPreviewToken({
      actorRoles: publisher,
      actorUserId: "publisher_1",
      targetAuthorId: "author_1",
      targetAuthorTopRole: "author",
      targetStatus: "approved",
    }),
    true,
  );
  assert.equal(
    canCreateContentPreviewToken({
      actorRoles: publisher,
      actorUserId: "publisher_1",
      targetAuthorId: "publisher_2",
      targetAuthorTopRole: "publisher",
      targetStatus: "approved",
    }),
    false,
  );
});

test("archived content cannot get preview tokens", () => {
  assert.equal(
    canCreateContentPreviewToken({
      actorRoles: admin,
      actorUserId: "admin_1",
      targetAuthorId: "author_1",
      targetStatus: "archived",
    }),
    false,
  );
});
