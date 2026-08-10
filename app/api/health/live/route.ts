import { sql } from "drizzle-orm";

import { db } from "@/db";
import { loadWebshopAddon } from "@/lib/webshop-addon/loader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    const addon = await loadWebshopAddon();
    const buildId = process.env.WEBSHOP_RUNTIME_BUILD_ID?.trim();
    const cmsCommitSha = process.env.NR_CMS_RELEASE_SHA?.trim();
    const artifactSha256 = process.env.WEBSHOP_RUNTIME_ARTIFACT_SHA256?.trim();
    if (addon.status !== "loaded" || !buildId || !cmsCommitSha?.match(/^[a-f0-9]{40}$/) || !artifactSha256?.match(/^[a-f0-9]{64}$/)) throw new Error("managed_runtime_tuple_missing");
    return Response.json({ ok: true, buildId, cmsCommitSha, database: "reachable", addonsLoaded: { webshop: { packageVersion: addon.addon.version, artifactSha256 } } }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
