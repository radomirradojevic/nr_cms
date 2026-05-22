import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { logLockEvent, releaseLock } from "@/data/form-locks";
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

  let clientId: string | null = null;
  try {
    const ctype = request.headers.get("content-type") ?? "";
    if (ctype.includes("application/json")) {
      const parsed = bodySchema.safeParse(await request.json());
      if (parsed.success) clientId = parsed.data.clientId;
    } else {
      const text = await request.text();
      if (text) {
        try {
          const parsed = bodySchema.safeParse(JSON.parse(text));
          if (parsed.success) clientId = parsed.data.clientId;
        } catch {
          /* sendBeacon release is best-effort */
        }
      }
    }
  } catch {
    /* release is idempotent */
  }

  if (!clientId) {
    return new NextResponse(null, { status: 204 });
  }

  const released = await releaseLock({
    formId,
    userId: actor.userId,
    sessionId: actor.sessionId,
    clientId,
  });

  if (released) {
    await logLockEvent({
      formId,
      userId: actor.userId,
      event: "released",
      metadata: { sessionId: actor.sessionId, clientId },
    });
  }

  return new NextResponse(null, { status: 204 });
}
