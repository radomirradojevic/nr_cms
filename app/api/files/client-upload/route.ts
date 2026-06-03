import { NextRequest, NextResponse } from "next/server";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  extFromMime,
  formatBytes,
  isMimeAllowed,
  kindFromMime,
  sanitizeFilename,
} from "@/lib/file-manager";
import { buildStoragePath, getStorageProviderName } from "@/lib/file-storage";
import { requireFileUploadUser } from "@/lib/file-upload-auth";
import { createClientUploadTicket } from "@/lib/file-upload-tickets";
import { getGlobalSettings } from "@/data/global-settings";

export const maxDuration = 60;

const TOKEN_TTL_MS = 15 * 60 * 1000;

const prepareSchema = z.object({
  filename: z.string().min(1).max(500),
  type: z.string().max(200).optional(),
  size: z.number().int().positive(),
});

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  pdf: "application/pdf",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function mimeFromFilename(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  return MIME_BY_EXT[ext] ?? null;
}

function resolveMime(filename: string, declaredType?: string): string | null {
  const declared = declaredType?.trim().toLowerCase();
  if (declared && isMimeAllowed(declared)) return declared;
  const inferred = mimeFromFilename(filename);
  return inferred && isMimeAllowed(inferred) ? inferred : null;
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

  let parsed: z.infer<typeof prepareSchema>;
  try {
    parsed = prepareSchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid upload request." },
      { status: 400 },
    );
  }

  const filename = sanitizeFilename(parsed.filename);
  const mime = resolveMime(filename, parsed.type);
  if (!mime) {
    return NextResponse.json(
      { error: "File type is not allowed." },
      { status: 400 },
    );
  }

  const kind = kindFromMime(mime);
  if (!kind) {
    return NextResponse.json(
      { error: "File type is not allowed." },
      { status: 400 },
    );
  }

  const settings = await getGlobalSettings();
  if (parsed.size > settings.maxUploadSizeBytes) {
    return NextResponse.json(
      {
        error: `File exceeds ${formatBytes(settings.maxUploadSizeBytes)} limit.`,
      },
      { status: 413 },
    );
  }

  const id = randomUUID();
  const storagePath = buildStoragePath(id, extFromMime(mime));
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const ticket = createClientUploadTicket({
    id,
    storagePath,
    filename,
    mimeType: mime,
    sizeBytes: parsed.size,
    kind,
    uploadedBy: caller.userId,
    exp: expiresAt,
  });

  try {
    const clientToken = await generateClientTokenFromReadWriteToken({
      pathname: storagePath,
      addRandomSuffix: false,
      allowOverwrite: false,
      allowedContentTypes: [mime],
      maximumSizeInBytes: settings.maxUploadSizeBytes,
      validUntil: expiresAt,
    });

    return NextResponse.json({
      id,
      storagePath,
      filename,
      mimeType: mime,
      clientToken,
      ticket,
    });
  } catch (err) {
    console.error("[POST /api/files/client-upload] token failed:", err);
    return NextResponse.json(
      { error: "Could not prepare upload." },
      { status: 500 },
    );
  }
}
