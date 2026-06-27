import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { webshopDigitalAssets } from "@/db/schema";
import { getFileByIdUnchecked } from "@/data/files";
import { readUpload } from "@/lib/file-storage";
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

  const row = await getFileByIdUnchecked(id);
  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const protectedDigitalAssetRows = await db
    .select({ id: webshopDigitalAssets.id })
    .from(webshopDigitalAssets)
    .where(eq(webshopDigitalAssets.fileId, id))
    .limit(1);
  if (protectedDigitalAssetRows.length > 0) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
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
