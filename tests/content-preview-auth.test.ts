import test from "node:test";
import assert from "node:assert/strict";

import {
  canAccessContentPreview,
  canCreateContentPreviewToken,
  hasContentPreviewRole,
} from "@/lib/content-preview-auth";
import type { Role } from "@/lib/roles";

const admin: Role[] = ["admin"];
const author: Role[] = ["author"];
const publisher: Role[] = ["publisher"];
const viewer: Role[] = ["viewer"];

test("preview role is limited to backend content roles", () => {
  assert.equal(hasContentPreviewRole(admin), true);
  assert.equal(hasContentPreviewRole(publisher), true);
  assert.equal(hasContentPreviewRole(author), true);
  assert.equal(hasContentPreviewRole(viewer), false);
});

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

test("viewer cannot preview content even when the viewer is the owner", () => {
  assert.equal(
    canCreateContentPreviewToken({
      actorRoles: viewer,
      actorUserId: "viewer_1",
      targetAuthorId: "viewer_1",
      targetStatus: "draft",
    }),
    false,
  );
  assert.equal(
    canAccessContentPreview({
      actorRoles: viewer,
      actorUserId: "viewer_1",
      targetAuthorId: "viewer_1",
      targetStatus: "draft",
    }),
    false,
  );
});

test("preview access follows token creation RBAC", () => {
  assert.equal(
    canAccessContentPreview({
      actorRoles: admin,
      actorUserId: "admin_1",
      targetAuthorId: "publisher_1",
      targetAuthorTopRole: "publisher",
      targetStatus: "draft",
    }),
    true,
  );
  assert.equal(
    canAccessContentPreview({
      actorRoles: author,
      actorUserId: "author_1",
      targetAuthorId: "author_2",
      targetStatus: "draft",
    }),
    false,
  );
  assert.equal(
    canAccessContentPreview({
      actorRoles: publisher,
      actorUserId: "publisher_1",
      targetAuthorId: "publisher_2",
      targetAuthorTopRole: "publisher",
      targetStatus: "approved",
    }),
    false,
  );
});
