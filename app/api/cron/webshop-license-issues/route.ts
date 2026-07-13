import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { runWebshopFulfillmentSafetyNet } from "@/lib/webshop-addon/fulfillment-cron-adapter";

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}

async function run(request: Request) {
  const secret = process.env.WEBSHOP_LICENSE_ISSUE_CRON_SECRET?.trim();
  if (secret) {
    const header = request.headers.get("authorization") ?? "";
    if (!timingSafeBearerMatch(header, secret)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  } else {
    return NextResponse.json(
      { error: "Cron secret is not configured." },
      { status: 503 },
    );
  }

  const result = await runWebshopFulfillmentSafetyNet(25);
  return NextResponse.json({ ok: true, ...result });
}

function timingSafeBearerMatch(header: string, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
