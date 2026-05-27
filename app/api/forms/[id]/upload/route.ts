import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";

import { getPublishedFormById } from "@/data/forms";
import { countFilesByUploaderSince, insertFile } from "@/data/files";
import { sanitizeSvgMarkup } from "@/lib/content-sanitizer";
import {
  MAX_FILE_SIZE,
  extFromMime,
  formatBytes,
  isMimeAllowed,
  kindFromMime,
  sanitizeFilename,
} from "@/lib/file-manager";
import {
  buildStoragePath,
  getMaxUploadBytes,
  getStorageProviderName,
  writeUpload,
} from "@/lib/file-storage";
import { getClientIp, hashIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  FORM_UPLOAD_DAY_WINDOW_MAX,
  FORM_UPLOAD_DAY_WINDOW_MS,
  FORM_UPLOAD_SHORT_WINDOW_MAX,
  FORM_UPLOAD_SHORT_WINDOW_MS,
  buildFormUploadOwner,
} from "@/lib/form-upload-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const GENERIC_ERROR = "Upload failed.";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function err(status: number, message = GENERIC_ERROR) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

async function isSameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("host");
  if (!origin || !host) return false;
  try {
    const u = new URL(origin);
    return u.host === host;
  } catch {
    return false;
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) return err(404, "Form not found.");
    if (!(await isSameOrigin())) return err(403, "Invalid request origin.");

    const detail = await getPublishedFormById(id);
    if (!detail) return err(404, "Form not found.");

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return err(400, "Invalid form data.");
    }
    const fieldKey = String(form.get("fieldKey") ?? "");
    const file = form.get("file");
    if (!(file instanceof File)) return err(400, "No file provided.");

    const fieldDef = detail.fields.find(
      (f: (typeof detail.fields)[number]) =>
        f.fieldKey === fieldKey && f.fieldType === "file",
    );
    if (!fieldDef) return err(400, "Unknown field.");

    const validation = (fieldDef.validation ?? {}) as {
      accept?: string[];
      maxFileSizeKb?: number;
    };
    const fieldMax = validation.maxFileSizeKb
      ? validation.maxFileSizeKb * 1024
      : MAX_FILE_SIZE;
    const providerMax = getMaxUploadBytes();
    const effectiveMax = Math.min(fieldMax, MAX_FILE_SIZE, providerMax);

    if (file.size > effectiveMax) {
      const providerName = getStorageProviderName();
      const hint =
        providerMax === effectiveMax && providerName === "vercel-blob"
          ? " (Vercel request body limit; enable Fluid Compute to raise it)"
          : "";
      return err(
        413,
        `File exceeds ${formatBytes(effectiveMax)} limit${hint}.`,
      );
    }

    const ip = await getClientIp();
    const ipHash = hashIp(ip);
    const uploadOwner = buildFormUploadOwner(id, ipHash);

    if (detail.settings.enableTurnstile) {
      const tok = String(form.get("turnstileToken") ?? "");
      if (!tok) return err(400, "Captcha required before uploading files.");
      const ok = await verifyTurnstile(tok, ip);
      if (!ok) return err(400, "Captcha verification failed.");
    }

    const now = Date.now();
    const recentCount = await countFilesByUploaderSince(
      uploadOwner,
      new Date(now - FORM_UPLOAD_SHORT_WINDOW_MS),
    );
    if (recentCount >= FORM_UPLOAD_SHORT_WINDOW_MAX) {
      return err(429, "Too many uploads. Please wait a few minutes.");
    }
    const dayCount = await countFilesByUploaderSince(
      uploadOwner,
      new Date(now - FORM_UPLOAD_DAY_WINDOW_MS),
    );
    if (dayCount >= FORM_UPLOAD_DAY_WINDOW_MAX) {
      return err(429, "Daily upload limit reached.");
    }

    const original = sanitizeFilename(file.name || "file");
    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    const sniffed = await fileTypeFromBuffer(buffer);
    let mime: string | null = sniffed?.mime ?? null;
    if (!mime) {
      const head = buffer.slice(0, 1024).toString("utf8").trim().toLowerCase();
      if (head.startsWith("<?xml") || head.startsWith("<svg")) {
        mime = "image/svg+xml";
      } else if (file.type === "text/plain") {
        mime = "text/plain";
      }
    }
    if (!mime || !isMimeAllowed(mime)) {
      return err(400, `File type ${mime ?? "unknown"} is not allowed.`);
    }
    if (
      Array.isArray(validation.accept) &&
      validation.accept.length > 0 &&
      !validation.accept.includes(mime)
    ) {
      return err(400, "File type not allowed for this field.");
    }

    if (mime === "image/svg+xml") {
      const sanitized = sanitizeSvgMarkup(buffer.toString("utf8"));
      buffer = Buffer.from(sanitized, "utf8");
    }

    const kind = kindFromMime(mime);
    if (!kind) return err(400, "File type not allowed.");

    const fileId = randomUUID();
    const ext = extFromMime(mime);
    const storagePath = buildStoragePath(fileId, ext);
    await writeUpload(storagePath, buffer, { contentType: mime });

    const row = await insertFile({
      filename: original,
      storagePath,
      mimeType: mime,
      sizeBytes: buffer.length,
      kind,
      uploadedBy: uploadOwner,
    });

    return NextResponse.json(
      {
        fileId: row.id,
        originalName: row.filename,
        mime: row.mimeType,
        size: row.sizeBytes,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return err(500);
  }
}
