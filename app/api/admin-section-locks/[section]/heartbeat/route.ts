import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { heartbeatLock, logLockEvent } from "@/data/admin-section-locks";
import {
  HEARTBEAT_INTERVAL_SECONDS,
  LEASE_TTL_SECONDS,
  TAKEOVER_GRACE_SECONDS,
  isAdminSectionKey,
} from "@/lib/admin-section-locks";
import { getAdminSectionActor } from "@/lib/admin-section-locks-server";

const bodySchema = z.object({
  clientId: z.string().min(1).max(128),
});

export async function POST(
  request: NextRequest,
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

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const holder = await heartbeatLock({
    sectionKey: section,
    userId: actor.userId,
    sessionId: actor.sessionId,
    clientId: parsed.data.clientId,
  });

  if (!holder) {
    return NextResponse.json(
      { ok: false, error: "LOCK_LOST" },
      { status: 409 },
    );
  }

  await logLockEvent({
    sectionKey: section,
    userId: actor.userId,
    event: "refreshed",
    metadata: { sessionId: actor.sessionId, clientId: parsed.data.clientId },
  });

  return NextResponse.json(
    {
      ok: true,
      holder,
      config: {
        leaseTtlSeconds: LEASE_TTL_SECONDS,
        heartbeatIntervalSeconds: HEARTBEAT_INTERVAL_SECONDS,
        takeoverGraceSeconds: TAKEOVER_GRACE_SECONDS,
      },
    },
    { status: 200 },
  );
}
