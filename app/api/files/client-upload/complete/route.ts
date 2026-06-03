import { NextRequest, NextResponse } from "next/server";
import { del, head, put } from "@vercel/blob";
import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";
import { formatBytes, isMimeAllowed, kindFromMime } from "@/lib/file-manager";
import { sanitizeSvgMarkup } from "@/lib/content-sanitizer";
import { getStorageProviderName } from "@/lib/file-storage";
import { requireFileUploadUser } from "@/lib/file-upload-auth";
import { verifyClientUploadTicket } from "@/lib/file-upload-tickets";
import { getFileByIdUnchecked, insertFile } from "@/data/files";

export const maxDuration = 300;

const completeSchema = z.object({
  ticket: z.string().min(1),
});

type BlobValidation =
  | { ok: true; mime: string; sanitizedSvg?: Buffer }
  | { ok: false; error: string };

async function deleteBlobQuietly(storagePath: string) {
  try {
    await del(storagePath);
  } catch (err) {
    console.error(
      "[POST /api/files/client-upload/complete] cleanup failed:",
      err,
    );
  }
}

async function fetchBlobBuffer(url: string, bytes?: number): Promise<Buffer> {
  const headers = bytes ? { Range: `bytes=0-${bytes - 1}` } : undefined;
  const res = await fetch(url, { headers });
  if (!res.ok && res.status !== 206) {
    throw new Error(`Blob fetch failed (${res.status} ${res.statusText})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function validateBlobContent(
  url: string,
  expectedMime: string,
): Promise<BlobValidation> {
  if (expectedMime === "image/svg+xml") {
    const buffer = await fetchBlobBuffer(url);
    const headText = buffer
      .slice(0, 1024)
      .toString("utf8")
      .trim()
      .toLowerCase();
    if (!headText.startsWith("<?xml") && !headText.startsWith("<svg")) {
      return { ok: false, error: "Uploaded SVG content is invalid." };
    }
    const sanitized = sanitizeSvgMarkup(buffer.toString("utf8"));
    return {
      ok: true,
      mime: "image/svg+xml",
      sanitizedSvg: Buffer.from(sanitized, "utf8"),
    };
  }

  const prefix = await fetchBlobBuffer(url, 8192);
  const sniffed = await fileTypeFromBuffer(prefix);
  let mime = sniffed?.mime ?? null;

  if (!mime && expectedMime === "text/plain") {
    mime = "text/plain";
  }

  if (!mime || !isMimeAllowed(mime)) {
    return {
      ok: false,
      error: `File type ${mime ?? "unknown"} is not allowed.`,
    };
  }

  if (mime !== expectedMime) {
    return {
      ok: false,
      error: `File content type ${mime} does not match ${expectedMime}.`,
    };
  }

  return { ok: true, mime };
}

export async function POST(req: NextRequest) {
  if (getStorageProviderName() !== "vercel-blob") {
    return NextResponse.json(
      { error: "Direct client uploads are only available with Vercel Blob." },
      { status: 400 },
    );
  }

  const caller = await requireFileUploadUser();
  if (!caller.ok) {
    return NextResponse.json(
      { error: caller.error },
      { status: caller.status },
    );
  }

  let ticket: string;
  try {
    ticket = completeSchema.parse(await req.json()).ticket;
  } catch {
    return NextResponse.json(
      { error: "Invalid upload completion." },
      { status: 400 },
    );
  }

  const payload = verifyClientUploadTicket(ticket);
  if (!payload) {
    return NextResponse.json(
      { error: "Upload ticket is invalid or expired." },
      { status: 400 },
    );
  }

  if (payload.uploadedBy !== caller.userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const existing = await getFileByIdUnchecked(payload.id);
  if (existing) {
    return NextResponse.json({ file: existing });
  }

  let meta: Awaited<ReturnType<typeof head>>;
  try {
    meta = await head(payload.storagePath);
  } catch (err) {
    console.error("[POST /api/files/client-upload/complete] head failed:", err);
    return NextResponse.json(
      { error: "Uploaded blob was not found." },
      { status: 400 },
    );
  }

  if (meta.size !== payload.sizeBytes) {
    await deleteBlobQuietly(payload.storagePath);
    return NextResponse.json(
      {
        error: `Uploaded size ${formatBytes(meta.size)} does not match the requested size ${formatBytes(payload.sizeBytes)}.`,
      },
      { status: 400 },
    );
  }

  const storedMime = meta.contentType.split(";")[0]?.trim().toLowerCase();
  if (storedMime && storedMime !== payload.mimeType) {
    await deleteBlobQuietly(payload.storagePath);
    return NextResponse.json(
      {
        error: `Stored content type ${storedMime} does not match ${payload.mimeType}.`,
      },
      { status: 400 },
    );
  }

  const validation = await validateBlobContent(meta.url, payload.mimeType);
  if (!validation.ok) {
    await deleteBlobQuietly(payload.storagePath);
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  let sizeBytes = payload.sizeBytes;
  if (validation.sanitizedSvg) {
    sizeBytes = validation.sanitizedSvg.length;
    await put(payload.storagePath, validation.sanitizedSvg, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: validation.mime,
    });
  }

  const kind = kindFromMime(validation.mime);
  if (!kind) {
    await deleteBlobQuietly(payload.storagePath);
    return NextResponse.json(
      { error: "File type is not allowed." },
      { status: 400 },
    );
  }

  try {
    const row = await insertFile({
      id: payload.id,
      filename: payload.filename,
      storagePath: payload.storagePath,
      mimeType: validation.mime,
      sizeBytes,
      kind,
      uploadedBy: payload.uploadedBy,
    });
    return NextResponse.json({ file: row });
  } catch (err) {
    console.error(
      "[POST /api/files/client-upload/complete] insert failed:",
      err,
    );
    await deleteBlobQuietly(payload.storagePath);
    return NextResponse.json(
      { error: "Could not save uploaded file." },
      { status: 500 },
    );
  }
}
