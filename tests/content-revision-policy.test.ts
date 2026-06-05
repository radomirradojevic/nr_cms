import assert from "node:assert/strict";
import test from "node:test";

import {
  getStatusRevisionChangeType,
  resolveRestoredContentStatus,
} from "@/lib/content-revision-policy";

test("status transitions map to revision change types", () => {
  assert.equal(
    getStatusRevisionChangeType({
      fromStatus: "draft",
      toStatus: "in_review",
    }),
    "submitted_for_review",
  );
  assert.equal(
    getStatusRevisionChangeType({
      fromStatus: "approved",
      toStatus: "published",
    }),
    "published",
  );
  assert.equal(
    getStatusRevisionChangeType({
      fromStatus: "published",
      toStatus: "draft",
    }),
    "unpublished",
  );
  assert.equal(
    getStatusRevisionChangeType({
      fromStatus: "draft",
      toStatus: "draft",
    }),
    "saved",
  );
});

test("author-only restore downgrades published revision to draft", () => {
  assert.equal(
    resolveRestoredContentStatus({
      actorRoles: ["author"],
      canEditTarget: true,
      currentStatus: "draft",
      isOwner: true,
      revisionStatus: "published",
    }),
    "draft",
  );
});

test("publisher restore keeps revision status only when workflow allows it", () => {
  assert.equal(
    resolveRestoredContentStatus({
      actorRoles: ["publisher"],
      canEditTarget: true,
      currentStatus: "approved",
      isOwner: false,
      revisionStatus: "published",
    }),
    "published",
  );
  assert.equal(
    resolveRestoredContentStatus({
      actorRoles: ["publisher"],
      canEditTarget: true,
      currentStatus: "published",
      isOwner: false,
      revisionStatus: "approved",
    }),
    "draft",
  );
});
