import { sql } from "drizzle-orm";

import { db } from "@/db";
import { loadWebshopAddon } from "@/lib/webshop-addon/loader";
import { loadLicenseServerAddon } from "@/lib/license-server-addon/loader";
import {
  addonReleaseMetadata,
  cmsAddonRuntimeContractVersion,
  cmsCoreSchemaVersion,
  cmsReleaseChannel,
  cmsReleaseSha,
  cmsVersion,
  managedRuntimeBuildId,
} from "@/.generated/addon-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    const activeAddonKey = process.env.NR_ACTIVE_MANAGED_ADDON_KEY?.trim();
    const addonKeys = (["webshop", "license-server"] as const).filter(
      (addonKey) => {
        const prefix = addonKey === "webshop" ? "WEBSHOP" : "LICENSE_SERVER";
        return Boolean(
          process.env[`${prefix}_RUNTIME_RELEASE_ID`]?.trim() ||
          addonKey in addonReleaseMetadata,
        );
      },
    );
    if (
      addonKeys.length === 0 &&
      (activeAddonKey === "webshop" || activeAddonKey === "license-server")
    )
      addonKeys.push(activeAddonKey);
    const buildId =
      process.env.NR_MANAGED_RUNTIME_BUILD_ID?.trim() ??
      process.env[
        `${activeAddonKey === "license-server" ? "LICENSE_SERVER" : "WEBSHOP"}_RUNTIME_BUILD_ID`
      ]?.trim() ??
      managedRuntimeBuildId;
    const cmsCommitSha =
      process.env.NR_CMS_RELEASE_SHA?.trim() || cmsReleaseSha;
    if (
      !buildId?.match(/^[a-f0-9]{64}$/) ||
      !cmsCommitSha?.match(/^[a-f0-9]{40}$/)
    )
      throw new Error("managed_runtime_tuple_missing");
    const addonsLoaded: Record<
      string,
      { packageVersion: string; artifactSha256: string }
    > = {};
    for (const addonKey of addonKeys) {
      const addon =
        addonKey === "webshop"
          ? await loadWebshopAddon()
          : await loadLicenseServerAddon();
      const runtimePrefix =
        addonKey === "webshop" ? "WEBSHOP" : "LICENSE_SERVER";
      const metadata = addonReleaseMetadata[addonKey];
      const artifactSha256 =
        process.env[`${runtimePrefix}_RUNTIME_ARTIFACT_SHA256`]?.trim() ??
        metadata?.artifactSha256;
      const addonBuildId =
        process.env[`${runtimePrefix}_RUNTIME_BUILD_ID`]?.trim() ??
        managedRuntimeBuildId;
      if (
        addon.status !== "loaded" ||
        addonBuildId !== buildId ||
        !artifactSha256?.match(/^[a-f0-9]{64}$/)
      )
        throw new Error("managed_runtime_tuple_missing");
      addonsLoaded[addonKey] = {
        packageVersion: addon.addon.version,
        artifactSha256,
      };
    }
    return Response.json(
      {
        ok: true,
        buildId,
        cmsVersion,
        cmsCommitSha,
        cmsReleaseChannel,
        cmsCoreSchemaVersion,
        cmsAddonRuntimeContractVersion,
        database: "reachable",
        addonsLoaded,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { ok: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
