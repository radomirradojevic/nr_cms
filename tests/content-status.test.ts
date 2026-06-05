import test from "node:test";
import assert from "node:assert/strict";

import {
  canAuthorEditOwnContentStatus,
  canCreateContentWithStatus,
  canTransitionContentStatus,
  getContentStatusLabel,
  isContentStatus,
  resolveCreateContentStatus,
} from "@/lib/content-status";
import type { Role } from "@/lib/roles";

const author: Role[] = ["author"];
const publisher: Role[] = ["publisher"];
const admin: Role[] = ["admin"];

test("recognizes workflow statuses and labels", () => {
  assert.equal(isContentStatus("draft"), true);
  assert.equal(isContentStatus("in_review"), true);
  assert.equal(isContentStatus("unpublished"), false);
  assert.equal(getContentStatusLabel("approved"), "Approved");
  assert.equal(getContentStatusLabel("something_else"), "something_else");
});

test("author-only create status resolves to draft even when another status is requested", () => {
  assert.equal(resolveCreateContentStatus(author, undefined), "draft");
  assert.equal(resolveCreateContentStatus(author, "published"), "draft");
  assert.equal(canCreateContentWithStatus(author, "published"), false);
});

test("publisher/admin can create draft, approved, or published but not archived", () => {
  assert.equal(resolveCreateContentStatus(publisher, undefined), "draft");
  assert.equal(resolveCreateContentStatus(publisher, "approved"), "approved");
  assert.equal(resolveCreateContentStatus(admin, "published"), "published");
  assert.equal(resolveCreateContentStatus(publisher, "archived"), null);
});

test("author-only users can only edit their own draft or in-review content", () => {
  assert.equal(canAuthorEditOwnContentStatus(author, "draft"), true);
  assert.equal(canAuthorEditOwnContentStatus(author, "in_review"), true);
  assert.equal(canAuthorEditOwnContentStatus(author, "approved"), false);
  assert.equal(canAuthorEditOwnContentStatus(author, "published"), false);
  assert.equal(canAuthorEditOwnContentStatus(author, "archived"), false);
});

test("author-only transition is limited to submit for review and return to draft", () => {
  assert.equal(
    canTransitionContentStatus({
      actorRoles: author,
      canEditTarget: true,
      fromStatus: "draft",
      isOwner: true,
      toStatus: "in_review",
    }),
    true,
  );
  assert.equal(
    canTransitionContentStatus({
      actorRoles: author,
      canEditTarget: true,
      fromStatus: "in_review",
      isOwner: true,
      toStatus: "draft",
    }),
    true,
  );
  assert.equal(
    canTransitionContentStatus({
      actorRoles: author,
      canEditTarget: true,
      fromStatus: "in_review",
      isOwner: true,
      toStatus: "approved",
    }),
    false,
  );
  assert.equal(
    canTransitionContentStatus({
      actorRoles: author,
      canEditTarget: true,
      fromStatus: "draft",
      isOwner: false,
      toStatus: "in_review",
    }),
    false,
  );
});

test("publisher/admin transitions cover review, publish, unpublish, and archive", () => {
  assert.equal(
    canTransitionContentStatus({
      actorRoles: publisher,
      canEditTarget: true,
      fromStatus: "in_review",
      isOwner: false,
      toStatus: "approved",
    }),
    true,
  );
  assert.equal(
    canTransitionContentStatus({
      actorRoles: publisher,
      canEditTarget: true,
      fromStatus: "approved",
      isOwner: false,
      toStatus: "published",
    }),
    true,
  );
  assert.equal(
    canTransitionContentStatus({
      actorRoles: publisher,
      canEditTarget: true,
      fromStatus: "published",
      isOwner: false,
      toStatus: "draft",
    }),
    true,
  );
  assert.equal(
    canTransitionContentStatus({
      actorRoles: admin,
      canEditTarget: true,
      fromStatus: "archived",
      isOwner: false,
      toStatus: "published",
    }),
    true,
  );
});

test("workflow transitions require edit permission", () => {
  assert.equal(
    canTransitionContentStatus({
      actorRoles: publisher,
      canEditTarget: false,
      fromStatus: "in_review",
      isOwner: false,
      toStatus: "approved",
    }),
    false,
  );
});
