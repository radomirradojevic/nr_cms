import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { runWebshopLicenseServerCatalogSync } from "@/lib/webshop-addon/license-server-catalog-cron-adapter";

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}

async function run(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const result = await runWebshopLicenseServerCatalogSync(25);
  return NextResponse.json(
    { ok: !result.unavailable, ...result },
    { status: result.unavailable ? 503 : 200 },
  );
}

export const dynamic = "force-dynamic";
