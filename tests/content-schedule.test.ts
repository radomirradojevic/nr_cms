import assert from "node:assert/strict";
import test from "node:test";

import {
  getContentScheduleState,
  isContentLive,
  normalizeContentScheduleForRestore,
  normalizeContentScheduleForWrite,
} from "@/lib/content-schedule";
import {
  dateTimeLocalInputToUtc,
  formatDateTimeLocalInputValue,
} from "@/lib/regional-settings";

const NOW = new Date("2026-06-05T10:00:00.000Z");
const PAST = new Date("2026-06-05T09:00:00.000Z");
const FUTURE = new Date("2026-06-05T11:00:00.000Z");

test("public live helper hides future and expired published content", () => {
  assert.equal(
    isContentLive({ status: "published", publishAt: FUTURE }, NOW),
    false,
  );
  assert.equal(
    isContentLive({ status: "published", unpublishAt: PAST }, NOW),
    false,
  );
  assert.equal(
    isContentLive({ status: "published", publishAt: PAST }, NOW),
    true,
  );
  assert.equal(
    isContentLive({ status: "approved", publishAt: PAST }, NOW),
    false,
  );
});

test("schedule state is derived separately from workflow status", () => {
  assert.equal(
    getContentScheduleState({ status: "approved", publishAt: FUTURE }, NOW),
    "scheduled",
  );
  assert.equal(
    getContentScheduleState({ status: "published", unpublishAt: FUTURE }, NOW),
    "live_until",
  );
  assert.equal(
    getContentScheduleState({ status: "published", unpublishAt: PAST }, NOW),
    "expired",
  );
});

test("authors cannot set schedule fields", () => {
  const resolved = normalizeContentScheduleForWrite({
    actorRoles: ["author"],
    status: "draft",
    publishAtInput: FUTURE,
    unpublishAtInput: FUTURE,
    now: NOW,
  });

  assert.deepEqual(resolved, {
    ok: true,
    publishAt: null,
    unpublishAt: null,
    ignoredInput: true,
  });
});

test("publisher/admin scheduling rules reject invalid windows", () => {
  const invalidWindow = normalizeContentScheduleForWrite({
    actorRoles: ["publisher"],
    status: "approved",
    publishAtInput: FUTURE,
    unpublishAtInput: FUTURE,
    now: FUTURE,
  });
  assert.equal(invalidWindow.ok, false);

  const futurePublished = normalizeContentScheduleForWrite({
    actorRoles: ["admin"],
    status: "published",
    publishAtInput: FUTURE,
    now: NOW,
  });
  assert.equal(futurePublished.ok, false);

  const scheduled = normalizeContentScheduleForWrite({
    actorRoles: ["publisher"],
    status: "approved",
    publishAtInput: FUTURE,
    now: NOW,
  });
  assert.deepEqual(scheduled, {
    ok: true,
    publishAt: FUTURE,
    unpublishAt: null,
    ignoredInput: false,
  });
});

test("timezone-less schedule input uses configured regional timezone", () => {
  const publishAt = dateTimeLocalInputToUtc(
    "2026-06-06T19:15",
    "Europe/Belgrade",
  );
  assert.equal(publishAt?.toISOString(), "2026-06-06T17:15:00.000Z");
  assert.equal(
    formatDateTimeLocalInputValue(publishAt, "Europe/Belgrade"),
    "2026-06-06T19:15",
  );

  const scheduled = normalizeContentScheduleForWrite({
    actorRoles: ["publisher"],
    status: "approved",
    publishAtInput: "2026-06-06T19:15",
    unpublishAtInput: "2026-06-06T19:17",
    timeZone: "Europe/Belgrade",
    now: NOW,
  });

  assert.equal(scheduled.ok, true);
  if (scheduled.ok) {
    assert.equal(
      scheduled.publishAt?.toISOString(),
      "2026-06-06T17:15:00.000Z",
    );
    assert.equal(
      scheduled.unpublishAt?.toISOString(),
      "2026-06-06T17:17:00.000Z",
    );
  }
});

test("restore clears fully expired approved schedule windows", () => {
  const restored = normalizeContentScheduleForRestore({
    actorRoles: ["publisher"],
    status: "approved",
    publishAtInput: new Date("2026-06-05T08:00:00.000Z"),
    unpublishAtInput: PAST,
    now: NOW,
  });

  assert.deepEqual(restored, {
    ok: true,
    publishAt: null,
    unpublishAt: null,
    ignoredInput: false,
    sanitized: true,
  });
});

test("restore keeps future approved schedule windows", () => {
  const restored = normalizeContentScheduleForRestore({
    actorRoles: ["admin"],
    status: "approved",
    publishAtInput: FUTURE,
    unpublishAtInput: new Date("2026-06-05T12:00:00.000Z"),
    now: NOW,
  });

  assert.deepEqual(restored, {
    ok: true,
    publishAt: FUTURE,
    unpublishAt: new Date("2026-06-05T12:00:00.000Z"),
    ignoredInput: false,
    sanitized: false,
  });
});

test("restore removes stale schedule dates from published revisions", () => {
  const restored = normalizeContentScheduleForRestore({
    actorRoles: ["publisher"],
    status: "published",
    publishAtInput: PAST,
    unpublishAtInput: PAST,
    now: NOW,
  });

  assert.deepEqual(restored, {
    ok: true,
    publishAt: null,
    unpublishAt: null,
    ignoredInput: false,
    sanitized: true,
  });
});
