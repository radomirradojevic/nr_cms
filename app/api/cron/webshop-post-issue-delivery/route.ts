import { NextResponse } from "next/server";

import { runWebshopPostIssueDeliverySafetyNet } from "@/lib/webshop-addon/post-issue-cron-adapter";
import { isWebshopDeliveryWorkerAuthorized } from "@/lib/webshop-delivery-cron-auth";

export async function POST(request: Request) {
  if (!isWebshopDeliveryWorkerAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const result = await runWebshopPostIssueDeliverySafetyNet(25);
  return NextResponse.json({ ok: !result.unavailable, ...result }, { status: result.unavailable ? 503 : 200 });
}
export const dynamic = "force-dynamic";
