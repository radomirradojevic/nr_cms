import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { acquireLock, logLockEvent } from "@/data/form-locks";
import { getFormById } from "@/data/forms";
import {
  HEARTBEAT_INTERVAL_SECONDS,
  LEASE_TTL_SECONDS,
  TAKEOVER_GRACE_SECONDS,
} from "@/lib/form-locks";
import { getFormActor } from "@/lib/form-locks-server";

const bodySchema = z.object({
  clientId: z.string().min(1).max(128),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ formId: string }> },
) {
  const { formId } = await params;
  const actor = await getFormActor();
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

  const detail = await getFormById(formId);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await acquireLock({
    formId,
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

  if (
    result.ok &&
    (result.holder.userId !== actor.userId ||
      result.holder.sessionId !== actor.sessionId ||
      result.holder.clientId !== parsed.data.clientId)
  ) {
    console.warn("[form-locks] acquire returned mismatched holder", {
      formId,
      actorUserId: actor.userId,
      actorSessionId: actor.sessionId,
      clientId: parsed.data.clientId,
      holder: result.holder,
    });
    return NextResponse.json(
      { ok: false, error: "LOCKED", holder: result.holder, config },
      { status: 409 },
    );
  }

  if (result.ok) {
    await logLockEvent({
      formId,
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
    { ok: false, error: "LOCKED", holder: result.holder, config },
    { status: 409 },
  );
}
