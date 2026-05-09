import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getFileByIdUnchecked } from "@/data/files";
import { readUploadStream, statUpload } from "@/lib/file-storage";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { Readable } from "node:stream";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Validate id shape (uuid).
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const row = await getFileByIdUnchecked(id);
  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let size: number;
  try {
    const stat = await statUpload(row.storagePath);
    size = stat.size;
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const nodeStream = readUploadStream(row.storagePath);
  const webStream = Readable.toWeb(
    nodeStream,
  ) as NodeReadableStream<Uint8Array>;

  return new Response(webStream as unknown as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": row.mimeType,
      "Content-Length": String(size),
      "Content-Disposition": `inline; filename="${encodeURIComponent(row.filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
