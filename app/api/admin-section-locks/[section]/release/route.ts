import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { logLockEvent, releaseLock } from "@/data/admin-section-locks";
import { isAdminSectionKey } from "@/lib/admin-section-locks";
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
    return new NextResponse(null, { status: 204 });
  }

  const actor = await getAdminSectionActor();
  if (!actor) {
    return new NextResponse(null, { status: 204 });
  }

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
