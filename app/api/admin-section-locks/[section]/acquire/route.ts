import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { acquireLock, logLockEvent } from "@/data/admin-section-locks";
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

  const result = await acquireLock({
    sectionKey: section,
    userId: actor.userId,
    userDisplayName: actor.displayName,
    userRole: "admin",
    sessionId: actor.sessionId,
    clientId: parsed.data.clientId,
  });

  const config = {
    leaseTtlSeconds: LEASE_TTL_SECONDS,
    heartbeatIntervalSeconds: HEARTBEAT_INTERVAL_SECONDS,
    takeoverGraceSeconds: TAKEOVER_GRACE_SECONDS,
  };

  // Defense-in-depth: the DB SQL already guarantees that a foreign admin
  // cannot overwrite an active lock. Re-verify here that the row returned
  // by acquireLock truly belongs to the caller before reporting success.
  // If for ANY reason the holder identity does not match the actor (driver
  // quirk, race, future regression), treat this as a conflict and surface
  // the actual holder to the client instead of falsely granting ownership.
  if (
    result.ok &&
    (result.holder.userId !== actor.userId ||
      result.holder.sessionId !== actor.sessionId ||
      result.holder.clientId !== parsed.data.clientId)
  ) {
    console.warn(
      "[admin-section-locks] acquire returned ok=true with mismatched holder",
      {
        section,
        actorUserId: actor.userId,
        actorSessionId: actor.sessionId,
        clientId: parsed.data.clientId,
        holder: result.holder,
      },
    );
    return NextResponse.json(
      { ok: false, error: "LOCKED", holder: result.holder, config },
      { status: 409 },
    );
  }

  if (result.ok) {
    await logLockEvent({
      sectionKey: section,
      userId: actor.userId,
      event: "acquired",
      metadata: {
        sessionId: actor.sessionId,
        clientId: parsed.data.clientId,
      },
    });
    return NextResponse.json(
      { ok: true, holder: result.holder, config },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: "LOCKED",
      holder: result.holder,
      config,
    },
    { status: 409 },
  );
}
