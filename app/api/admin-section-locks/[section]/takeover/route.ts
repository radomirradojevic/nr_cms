import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  acquireLock,
  getLock,
  logLockEvent,
  takeoverLock,
} from "@/data/admin-section-locks";
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

  const previousHolder = await getLock(section);

  if (!previousHolder) {
    const acquired = await acquireLock({
      sectionKey: section,
      userId: actor.userId,
      userDisplayName: actor.displayName,
      userRole: "admin",
      sessionId: actor.sessionId,
      clientId: parsed.data.clientId,
    });
    if (acquired.ok) {
      await logLockEvent({
        sectionKey: section,
        userId: actor.userId,
        event: "acquired",
      });
      return NextResponse.json(
        {
          ok: true,
          holder: acquired.holder,
          config: {
            leaseTtlSeconds: LEASE_TTL_SECONDS,
            heartbeatIntervalSeconds: HEARTBEAT_INTERVAL_SECONDS,
            takeoverGraceSeconds: TAKEOVER_GRACE_SECONDS,
          },
        },
        { status: 200 },
      );
    }
    // Lost a race — fall through to takeover.
  }

  const result = await takeoverLock({
    sectionKey: section,
    newUserId: actor.userId,
    newUserDisplayName: actor.displayName,
    newSessionId: actor.sessionId,
    newClientId: parsed.data.clientId,
  });

  if (!result.ok) {
    if (result.reason === "ADMIN_HELD") {
      return NextResponse.json(
        {
          ok: false,
          error: "ADMIN_HELD",
          holder: previousHolder,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: false, error: "NOT_HELD" }, { status: 409 });
  }

  await logLockEvent({
    sectionKey: section,
    userId: actor.userId,
    event: "force_taken",
    previousUserId: previousHolder?.userId ?? null,
    metadata: {
      sessionId: actor.sessionId,
      clientId: parsed.data.clientId,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      holder: result.holder,
      config: {
        leaseTtlSeconds: LEASE_TTL_SECONDS,
        heartbeatIntervalSeconds: HEARTBEAT_INTERVAL_SECONDS,
        takeoverGraceSeconds: TAKEOVER_GRACE_SECONDS,
      },
    },
    { status: 200 },
  );
}
