import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canMutateGalleryFromManager,
  getGalleryManagerHref,
  getWebshopGalleryProductHref,
  isLockedGallery,
} from "@/lib/gallery-origin";

test("manual galleries remain editable in Gallery Manager", () => {
  const gallery = {
    id: "gallery-id",
    locked: false,
    origin: "manual",
    originId: null,
    originType: null,
  };

  assert.equal(isLockedGallery(gallery), false);
  assert.equal(canMutateGalleryFromManager(gallery), true);
  assert.equal(
    getGalleryManagerHref(gallery),
    "/dashboard/gallerymanager/gallery-id",
  );
});

test("webshop product galleries resolve to the product media editor", () => {
  const gallery = {
    id: "gallery-id",
    locked: true,
    origin: "webshop",
    originId: "11111111-1111-4111-8111-111111111111",
    originType: "product",
  };

  assert.equal(isLockedGallery(gallery), true);
  assert.equal(canMutateGalleryFromManager(gallery), false);
  assert.equal(
    getWebshopGalleryProductHref(gallery),
    "/dashboard/webshop/products/11111111-1111-4111-8111-111111111111?tab=media",
  );
});
