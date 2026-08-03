import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getFileByIdUnchecked } from "@/data/files";
import { readUpload, readUploadBuffer } from "@/lib/file-storage";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";
import { authorizeWebshopFileAccess } from "@/lib/webshop-addon/host-route-bindings";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { Readable } from "node:stream";

async function getWebshopFileAccess(fileId: string) {
  const { userId } = await auth();
  const user = userId ? await getOptionalCurrentUser() : null;
  return authorizeWebshopFileAccess({
    fileId,
    isAdmin: hasRole(getRoles(user?.publicMetadata), "admin"),
    userId,
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Validate id shape (uuid).
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const row = await getFileByIdUnchecked(id);
  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const fulfillmentFileAccess = await getWebshopFileAccess(id);
  if (!fulfillmentFileAccess.allowed) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (fulfillmentFileAccess.isProtected) {
    let buffer;
    try {
      buffer = await readUploadBuffer(row.storagePath);
    } catch {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": row.mimeType,
        "Content-Length": String(buffer.byteLength),
        "Content-Disposition": `inline; filename="${encodeURIComponent(row.filename)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  let result;
  try {
    result = await readUpload(row.storagePath);
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Remote object stores expose a public URL — redirect instead of proxying
  // bytes through the serverless function (saves invocation time + bandwidth).
  if (result.redirectUrl) {
    return NextResponse.redirect(result.redirectUrl, 307);
  }

  if (!result.stream) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const webStream = Readable.toWeb(
    result.stream,
  ) as NodeReadableStream<Uint8Array>;

  return new Response(webStream as unknown as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": row.mimeType,
      "Content-Length": String(result.size),
      "Content-Disposition": `inline; filename="${encodeURIComponent(row.filename)}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
export const dynamic = "force-dynamic";
