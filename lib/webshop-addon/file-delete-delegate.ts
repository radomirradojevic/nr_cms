import "server-only";

import { loadWebshopAddon } from "@/lib/webshop-addon/loader";

export type WebshopFileDeleteReferences = {
  categoryImages: number;
  categoryNames: string[];
  digitalAssets: number;
  digitalAssetProductNames: string[];
  digitalAssetEntitlementProductNames: string[];
  digitalAssetsWithEntitlements: number;
  digitalAssetMissingReplacementProductNames: string[];
  digitalAssetsWithoutPrivateReplacement: number;
  productCovers: number;
  productCoverNames: string[];
  productMedia: number;
  productMediaProductNames: string[];
};

export const EMPTY_WEBSHOP_FILE_DELETE_REFERENCES: WebshopFileDeleteReferences = {
  categoryImages: 0,
  categoryNames: [],
  digitalAssets: 0,
  digitalAssetProductNames: [],
  digitalAssetEntitlementProductNames: [],
  digitalAssetsWithEntitlements: 0,
  digitalAssetMissingReplacementProductNames: [],
  digitalAssetsWithoutPrivateReplacement: 0,
  productCovers: 0,
  productCoverNames: [],
  productMedia: 0,
  productMediaProductNames: [],
};

export async function findWebshopFileDeleteReferences(
  fileIds: readonly string[],
): Promise<WebshopFileDeleteReferences> {
  const loaded = await loadWebshopAddon();
  if (loaded.status === "not_installed") return EMPTY_WEBSHOP_FILE_DELETE_REFERENCES;
  if (loaded.status !== "loaded" || !loaded.addon.findFileDeleteReferences) {
    // Installed-but-unavailable packages fail closed: generic core code must
    // not delete an asset that an addon may still own.
    return {
      ...EMPTY_WEBSHOP_FILE_DELETE_REFERENCES,
      digitalAssets: fileIds.length,
      digitalAssetProductNames: ["Webshop add-on is not ready"],
    };
  }
  return loaded.addon.findFileDeleteReferences({ fileIds });
}
