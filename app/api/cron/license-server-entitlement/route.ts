import { NextResponse } from "next/server";

import { revalidateLicenseServerAddonEntitlement } from "@/lib/license-server-addon/license";

export async function POST(request: Request) {
  const secret = process.env.LICENSE_SERVER_ENTITLEMENT_CRON_SECRET?.trim();
  if (secret) {
    const header = request.headers.get("authorization") ?? "";
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  } else {
    return NextResponse.json(
      { error: "Cron secret is not configured." },
      { status: 503 },
    );
  }

  const result = await revalidateLicenseServerAddonEntitlement({
    force: true,
    reason: "cron",
    updatedBy: "system",
  });
  return NextResponse.json(
    {
      ok: result.ok,
      status: result.entitlement?.status ?? "missing",
      ...(result.ok ? {} : { error: result.error }),
    },
    { status: result.ok ? 200 : 502 },
  );
}
