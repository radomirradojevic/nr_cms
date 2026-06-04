import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeAppearanceLinkHref,
  parseAppearanceLinksText,
} from "@/lib/appearance-link-text";

test("appearance link text parser converts bare email hrefs to mailto links", () => {
  assert.equal(
    normalizeAppearanceLinkHref("neki_email@test.com"),
    "mailto:neki_email@test.com",
  );

  assert.deepEqual(parseAppearanceLinksText("mail | neki_email@test.com"), [
    { label: "email", href: "mailto:neki_email@test.com" },
  ]);
});

test("appearance link text parser preserves custom email labels", () => {
  assert.deepEqual(
    parseAppearanceLinksText("Contact | mailto:office@example.com"),
    [{ label: "Contact", href: "mailto:office@example.com" }],
  );
});
