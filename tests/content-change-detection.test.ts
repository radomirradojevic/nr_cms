import assert from "node:assert/strict";
import test from "node:test";

import { hasMeaningfulContentChanges } from "@/lib/content-change-detection";

test("save comparison ignores updatedBy-only metadata changes", () => {
  assert.equal(
    hasMeaningfulContentChanges(
      { title: "Same", updatedBy: "user_old" },
      { title: "Same", updatedBy: "user_new" },
    ),
    false,
  );
});

test("save comparison detects actual content changes", () => {
  assert.equal(
    hasMeaningfulContentChanges(
      { title: "Old", slug: "old" },
      { title: "New", slug: "old", updatedBy: "user_1" },
    ),
    true,
  );
});

test("save comparison treats equivalent dates and JSON as unchanged", () => {
  assert.equal(
    hasMeaningfulContentChanges(
      {
        publishAt: new Date("2026-06-05T18:00:00.000Z"),
        contentJson: { b: 2, a: { title: "Same" } },
      },
      {
        publishAt: new Date("2026-06-05T18:00:00.000Z"),
        contentJson: { a: { title: "Same" }, b: 2 },
      },
    ),
    false,
  );
});
