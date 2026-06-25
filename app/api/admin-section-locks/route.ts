import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  acquireLock,
  getLock,
  heartbeatLock,
  logLockEvent,
  releaseLock,
} from "@/data/admin-section-locks";
import {
  HEARTBEAT_INTERVAL_SECONDS,
  LEASE_TTL_SECONDS,
  TAKEOVER_GRACE_SECONDS,
  isAdminSectionKey,
  type AdminSectionLockKey,
} from "@/lib/admin-section-locks";
import { getAdminSectionActor } from "@/lib/admin-section-locks-server";

const bodySchema = z.object({
  clientId: z.string().min(1).max(128),
});

const config = {
  leaseTtlSeconds: LEASE_TTL_SECONDS,
  heartbeatIntervalSeconds: HEARTBEAT_INTERVAL_SECONDS,
  takeoverGraceSeconds: TAKEOVER_GRACE_SECONDS,
};

type LockAction = "acquire" | "heartbeat" | "release" | "status";

function readTarget(
  request: NextRequest,
):
  | { action: LockAction; section: AdminSectionLockKey }
  | { response: NextResponse } {
  const section = request.nextUrl.searchParams.get("section") ?? "";
  const action = request.nextUrl.searchParams.get("action") ?? "";

  if (!isAdminSectionKey(section)) {
    return {
      response: NextResponse.json(
        { error: "Unknown section" },
        { status: 404 },
      ),
    };
  }

  if (
    action !== "acquire" &&
    action !== "heartbeat" &&
    action !== "release" &&
    action !== "status"
  ) {
    return {
      response: NextResponse.json({ error: "Unknown action" }, { status: 400 }),
    };
  }

  return { action, section };
}

async function readRequiredBody(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return {
      response: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }),
    };
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return {
      response: NextResponse.json({ error: "Invalid body" }, { status: 400 }),
    };
  }

  return { clientId: parsed.data.clientId };
}

async function readOptionalClientId(request: NextRequest) {
  try {
    const ctype = request.headers.get("content-type") ?? "";
    if (ctype.includes("application/json")) {
      const json = await request.json();
      const parsed = bodySchema.safeParse(json);
      return parsed.success ? parsed.data.clientId : null;
    }

    const text = await request.text();
    if (!text) return null;
    const parsed = bodySchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data.clientId : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const target = readTarget(request);
  if ("response" in target) return target.response;
  const { action, section } = target;

  if (action !== "status") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  const actor = await getAdminSectionActor();
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const wasHeld = await getLock(section);
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
      config,
    },
    { status: 200 },
  );
}

export async function POST(request: NextRequest) {
  const target = readTarget(request);
  if ("response" in target) return target.response;
  const { action, section } = target;

  const actor = await getAdminSectionActor();
  if (!actor) {
    return action === "release"
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "release") {
    const clientId = await readOptionalClientId(request);
    if (!clientId) {
      return new NextResponse(null, { status: 204 });
    }

    const released = await releaseLock({
      sectionKey: section,
      userId: actor.userId,
      sessionId: actor.sessionId,
      clientId,
    });

    if (released) {
      await logLockEvent({
        sectionKey: section,
        userId: actor.userId,
        event: "released",
        metadata: { sessionId: actor.sessionId, clientId },
      });
    }

    return new NextResponse(null, { status: 204 });
  }

  if (action === "status") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  const body = await readRequiredBody(request);
  if ("response" in body) return body.response;

  if (action === "heartbeat") {
    const holder = await heartbeatLock({
      sectionKey: section,
      userId: actor.userId,
      sessionId: actor.sessionId,
      clientId: body.clientId,
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
      metadata: { sessionId: actor.sessionId, clientId: body.clientId },
    });

    return NextResponse.json({ ok: true, holder, config }, { status: 200 });
  }

  const result = await acquireLock({
    sectionKey: section,
    userId: actor.userId,
    userDisplayName: actor.displayName,
    userRole: "admin",
    sessionId: actor.sessionId,
    clientId: body.clientId,
  });

  if (
    result.ok &&
    (result.holder.userId !== actor.userId ||
      result.holder.sessionId !== actor.sessionId ||
      result.holder.clientId !== body.clientId)
  ) {
    console.warn(
      "[admin-section-locks] acquire returned ok=true with mismatched holder",
      {
        section,
        actorUserId: actor.userId,
        actorSessionId: actor.sessionId,
        clientId: body.clientId,
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
        clientId: body.clientId,
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
