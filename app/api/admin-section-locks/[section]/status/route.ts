import { NextResponse, type NextRequest } from "next/server";

import { getLock, logLockEvent } from "@/data/admin-section-locks";
import {
  HEARTBEAT_INTERVAL_SECONDS,
  LEASE_TTL_SECONDS,
  TAKEOVER_GRACE_SECONDS,
  isAdminSectionKey,
} from "@/lib/admin-section-locks";
import { getAdminSectionActor } from "@/lib/admin-section-locks-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ section: string }> },
) {
  const { section } = await params;
  if (!isAdminSectionKey(section)) {
    return NextResponse.json({ error: "Unknown section" }, { status: 404 });
  }

  const actor = await getAdminSectionActor();
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const wasHeld = await getLock(section);
  // getLock opportunistically reaps expired rows; re-fetch to detect an
  // expiry that happened between the two calls.
  const holder = await getLock(section);
  if (wasHeld && !holder) {
    await logLockEvent({
      sectionKey: section,
      userId: wasHeld.userId,
      event: "expired",
      metadata: { source: "status_peek" },
    });
  }

  return NextResponse.json(
    {
      ok: true,
      holder,
      serverNow: new Date().toISOString(),
      config: {
        leaseTtlSeconds: LEASE_TTL_SECONDS,
        heartbeatIntervalSeconds: HEARTBEAT_INTERVAL_SECONDS,
        takeoverGraceSeconds: TAKEOVER_GRACE_SECONDS,
      },
    },
    { status: 200 },
  );
}
