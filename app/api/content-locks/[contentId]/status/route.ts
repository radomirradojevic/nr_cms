import { NextResponse, type NextRequest } from "next/server";

import { getContentById } from "@/data/content";
import { getLock, logLockEvent } from "@/data/content-locks";
import {
  HEARTBEAT_INTERVAL_SECONDS,
  LEASE_TTL_SECONDS,
  TAKEOVER_GRACE_SECONDS,
  canEditContent,
} from "@/lib/content-locks";
import { getActor, loadAuthorRolesIfNeeded } from "@/lib/content-locks-server";
import { realtime } from "@/lib/content-locks-realtime";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> },
) {
  const { contentId } = await params;

  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const target = await getContentById(contentId);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const authorRoles = await loadAuthorRolesIfNeeded(
    actor.roles,
    target.authorId,
  );
  if (!canEditContent(actor, target, authorRoles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const wasHeld = await getLock(contentId);
  // getLock opportunistically reaps; if a lock just expired, holder will
  // be null while wasHeld was non-null at fetch time. We still want to
  // emit `expired`. Re-fetch and compare.
  const holder = await getLock(contentId);
  if (wasHeld && !holder) {
    await logLockEvent({
      contentId,
      userId: wasHeld.userId,
      event: "expired",
      metadata: { source: "status_peek" },
    });
    await realtime.publish(contentId, { type: "expired" });
  }

  return NextResponse.json(
    {
      ok: true,
      holder,
      contentVersion: target.version,
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
