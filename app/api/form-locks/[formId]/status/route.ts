import { NextResponse, type NextRequest } from "next/server";

import { getLock, logLockEvent } from "@/data/form-locks";
import { getFormById } from "@/data/forms";
import {
  HEARTBEAT_INTERVAL_SECONDS,
  LEASE_TTL_SECONDS,
  TAKEOVER_GRACE_SECONDS,
} from "@/lib/form-locks";
import { getFormActor } from "@/lib/form-locks-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ formId: string }> },
) {
  const { formId } = await params;
  const actor = await getFormActor();
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const detail = await getFormById(formId);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const wasHeld = await getLock(formId);
  const holder = await getLock(formId);
  if (wasHeld && !holder) {
    await logLockEvent({
      formId,
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
