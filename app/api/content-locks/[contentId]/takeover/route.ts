import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getContentById } from "@/data/content";
import {
  acquireLock,
  getLock,
  logLockEvent,
  takeoverLock,
} from "@/data/content-locks";
import {
  HEARTBEAT_INTERVAL_SECONDS,
  LEASE_TTL_SECONDS,
  TAKEOVER_GRACE_SECONDS,
  canEditContent,
  highestRole,
} from "@/lib/content-locks";
import { realtime } from "@/lib/content-locks-realtime";
import { getActor, loadAuthorRolesIfNeeded } from "@/lib/content-locks-server";
import { hasRole } from "@/lib/roles";

const bodySchema = z.object({
  clientId: z.string().min(1).max(128),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> },
) {
  const { contentId } = await params;

  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Admin-only.
  if (!hasRole(actor.roles, "admin")) {
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

  // Capture previous holder snapshot first (best-effort) for audit.
  const previousHolder = await getLock(contentId);

  // If no lock currently held, just acquire normally.
  if (!previousHolder) {
    const acquired = await acquireLock({
      contentId,
      userId: actor.userId,
      userDisplayName: actor.displayName,
      userRole: highestRole(actor.roles),
      sessionId: actor.sessionId,
      clientId: parsed.data.clientId,
    });
    if (acquired.ok) {
      await logLockEvent({
        contentId,
        userId: actor.userId,
        event: "acquired",
      });
      await realtime.publish(contentId, {
        type: "acquired",
        holder: acquired.holder,
      });
      return NextResponse.json(
        {
          ok: true,
          holder: acquired.holder,
          contentVersion: target.version,
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
    contentId,
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
    contentId,
    userId: actor.userId,
    event: "force_taken",
    previousUserId: previousHolder?.userId ?? result.previousUserId,
    metadata: {
      sessionId: actor.sessionId,
      clientId: parsed.data.clientId,
      previousHolder,
    },
  });
  await realtime.publish(contentId, {
    type: "force_taken",
    holder: result.holder,
    previousUserId: previousHolder?.userId ?? result.previousUserId,
  });

  return NextResponse.json(
    {
      ok: true,
      holder: result.holder,
      previousUserId: previousHolder?.userId ?? result.previousUserId,
      contentVersion: target.version,
      config: {
        leaseTtlSeconds: LEASE_TTL_SECONDS,
        heartbeatIntervalSeconds: HEARTBEAT_INTERVAL_SECONDS,
        takeoverGraceSeconds: TAKEOVER_GRACE_SECONDS,
      },
    },
    { status: 200 },
  );
}
