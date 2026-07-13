import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { isPathWithinRoot } from "@/lib/path-containment";

test("path containment rejects a sibling that only shares the root name prefix", () => {
  const root = path.resolve("storage", "uploads");

  assert.equal(isPathWithinRoot(root, root), true);
  assert.equal(isPathWithinRoot(root, path.join(root, "2026", "asset.bin")), true);
  assert.equal(
    isPathWithinRoot(root, path.join(`${root}-evil`, "asset.bin")),
    false,
  );
  assert.equal(isPathWithinRoot(root, path.dirname(root)), false);
});
