import { NextResponse } from "next/server";

import { isWebshopEntitlementWorkerAuthorized } from "@/lib/webshop-entitlement-cron-auth";
import { revalidateWebshopAddonEntitlement } from "@/lib/webshop-addon/license";

export async function POST(request: Request) {
  return run(request);
}

async function run(request: Request) {
  if (!isWebshopEntitlementWorkerAuthorized(request))
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const result = await revalidateWebshopAddonEntitlement({ force: true });
  return NextResponse.json(
    {
      ok: result.ok,
      status: result.entitlement?.status ?? "missing",
      ...(result.ok ? {} : { error: result.error }),
    },
    { status: result.ok ? 200 : 502 },
  );
}
export const dynamic = "force-dynamic";
