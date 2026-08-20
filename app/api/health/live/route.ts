import { sql } from "drizzle-orm";

import { db } from "@/db";
import { loadWebshopAddon } from "@/lib/webshop-addon/loader";
import { loadLicenseServerAddon } from "@/lib/license-server-addon/loader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    const addonKey = process.env.NR_ACTIVE_MANAGED_ADDON_KEY?.trim();
    if (addonKey !== "webshop" && addonKey !== "license-server") {
      throw new Error("managed_runtime_addon_key_missing");
    }
    const addon =
      addonKey === "webshop"
        ? await loadWebshopAddon()
        : await loadLicenseServerAddon();
    const runtimePrefix =
      addonKey === "webshop" ? "WEBSHOP" : "LICENSE_SERVER";
    const buildId = process.env[`${runtimePrefix}_RUNTIME_BUILD_ID`]?.trim();
    const cmsCommitSha = process.env.NR_CMS_RELEASE_SHA?.trim();
    const artifactSha256 = process.env[`${runtimePrefix}_RUNTIME_ARTIFACT_SHA256`]?.trim();
    if (addon.status !== "loaded" || !buildId || !cmsCommitSha?.match(/^[a-f0-9]{40}$/) || !artifactSha256?.match(/^[a-f0-9]{64}$/)) throw new Error("managed_runtime_tuple_missing");
    return Response.json({ ok: true, buildId, cmsCommitSha, database: "reachable", addonsLoaded: { [addonKey]: { packageVersion: addon.addon.version, artifactSha256 } } }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
