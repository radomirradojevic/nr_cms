import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { logLockEvent, releaseLock } from "@/data/content-locks";
import { realtime } from "@/lib/content-locks-realtime";
import { getActor } from "@/lib/content-locks-server";

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

  // Best-effort: support both JSON body and navigator.sendBeacon (text/plain).
  let clientId: string | null = null;
  try {
    const ctype = request.headers.get("content-type") ?? "";
    if (ctype.includes("application/json")) {
      const json = await request.json();
      const parsed = bodySchema.safeParse(json);
      if (parsed.success) clientId = parsed.data.clientId;
    } else {
      const text = await request.text();
      if (text) {
        try {
          const parsed = bodySchema.safeParse(JSON.parse(text));
          if (parsed.success) clientId = parsed.data.clientId;
        } catch {
          /* ignore — sendBeacon may send raw text */
        }
      }
    }
  } catch {
    /* swallow — release is best-effort and idempotent */
  }

  if (!clientId) {
    // No body — caller is asking for an idempotent no-op.
    return new NextResponse(null, { status: 204 });
  }

  const released = await releaseLock({
    contentId,
    userId: actor.userId,
    sessionId: actor.sessionId,
    clientId,
  });

  if (released) {
    await logLockEvent({
      contentId,
      userId: actor.userId,
      event: "released",
      metadata: { sessionId: actor.sessionId, clientId },
    });
    await realtime.publish(contentId, { type: "released" });
  }

  return new NextResponse(null, { status: 204 });
}
