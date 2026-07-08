import { NextResponse } from "next/server";

import { processPendingLicenseServerIssues } from "@/.private/webshop/src/data/webshop-license-server-issues";

export async function POST(request: Request) {
  const secret =
    process.env.WEBSHOP_LICENSE_ISSUE_CRON_SECRET ?? process.env.CRON_SECRET;
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

  const result = await processPendingLicenseServerIssues({
    includeFailed: true,
    limit: 25,
  });
  return NextResponse.json({ ok: true, ...result });
}
