import { NextResponse } from "next/server";

import { revalidateWebshopAddonEntitlement } from "@/lib/webshop-addon/license";

export async function GET(request: Request) { return run(request); }
export async function POST(request: Request) { return run(request); }

async function run(request: Request) {
  const secret = process.env.WEBSHOP_ENTITLEMENT_CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Cron secret is not configured." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const result = await revalidateWebshopAddonEntitlement({ force: true });
  return NextResponse.json({ ok: result.ok, status: result.entitlement?.status ?? "missing", ...(result.ok ? {} : { error: result.error }) }, { status: result.ok ? 200 : 502 });
}
