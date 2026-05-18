import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getContentById } from "@/data/content";
import { acquireLock, logLockEvent } from "@/data/content-locks";
import {
  HEARTBEAT_INTERVAL_SECONDS,
  LEASE_TTL_SECONDS,
  TAKEOVER_GRACE_SECONDS,
  canEditContent,
  highestRole,
} from "@/lib/content-locks";
import { realtime } from "@/lib/content-locks-realtime";
import { getActor, loadAuthorRolesIfNeeded } from "@/lib/content-locks-server";

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

  const result = await acquireLock({
    contentId,
    userId: actor.userId,
    userDisplayName: actor.displayName,
    userRole: highestRole(actor.roles),
    sessionId: actor.sessionId,
    clientId: parsed.data.clientId,
  });

  const config = {
    leaseTtlSeconds: LEASE_TTL_SECONDS,
    heartbeatIntervalSeconds: HEARTBEAT_INTERVAL_SECONDS,
    takeoverGraceSeconds: TAKEOVER_GRACE_SECONDS,
  };

  if (result.ok) {
    await logLockEvent({
      contentId,
      userId: actor.userId,
      event: "acquired",
      metadata: {
        sessionId: actor.sessionId,
        clientId: parsed.data.clientId,
      },
    });
    await realtime.publish(contentId, {
      type: "acquired",
      holder: result.holder,
    });
    return NextResponse.json(
      {
        ok: true,
        holder: result.holder,
        contentVersion: target.version,
        config,
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: "LOCKED",
      holder: result.holder,
      contentVersion: target.version,
      config,
    },
    { status: 409 },
  );
}
