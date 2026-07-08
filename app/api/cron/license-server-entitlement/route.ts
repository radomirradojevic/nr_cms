import { NextResponse } from "next/server";

import { revalidateLicenseServerAddonEntitlement } from "@/lib/license-server-addon/license";

export async function POST(request: Request) {
  const secret =
    process.env.LICENSE_SERVER_ENTITLEMENT_CRON_SECRET ??
    process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization") ?? "";
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
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
