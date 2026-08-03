import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { runWebshopFulfillmentSafetyNet } from "@/lib/webshop-addon/fulfillment-cron-adapter";

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}

async function run(request: Request) {
  if (!isCronRequestAuthorized(request))
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const result = await runWebshopFulfillmentSafetyNet(25);
  return NextResponse.json({ ok: true, ...result });
}
export const dynamic = "force-dynamic";
