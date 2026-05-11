import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import DOMPurify from "isomorphic-dompurify";

import { getPublishedFormById } from "@/data/forms";
import { insertFile } from "@/data/files";
import {
  MAX_FILE_SIZE,
  extFromMime,
  formatBytes,
  isMimeAllowed,
  kindFromMime,
  sanitizeFilename,
} from "@/lib/file-manager";
import { buildStoragePath, writeUpload } from "@/lib/file-storage";
import { getClientIp, hashIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { checkSubmissionRateLimit } from "@/data/forms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const GENERIC_ERROR = "Upload failed.";

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
      (f) => f.fieldKey === fieldKey && f.fieldType === "file",
    );
    if (!fieldDef) return err(400, "Unknown field.");

    const validation = (fieldDef.validation ?? {}) as {
      accept?: string[];
      maxFileSizeKb?: number;
    };
    const fieldMax = validation.maxFileSizeKb
      ? validation.maxFileSizeKb * 1024
      : MAX_FILE_SIZE;
    const effectiveMax = Math.min(fieldMax, MAX_FILE_SIZE);

    if (file.size > effectiveMax) {
      return err(413, `File exceeds ${formatBytes(effectiveMax)} limit.`);
    }

    // IP-based rate limit (reuse submission limiter keyed on file uploads).
    const ip = await getClientIp();
    const ipHash = hashIp(ip);
    const rl = await checkSubmissionRateLimit({
      formId: id,
      ipHash,
      payloadHash: `upload:${randomUUID()}`,
    });
    if (!rl.allowed) return err(429, rl.reason);

    // Optional Turnstile check, only if a token was supplied (the public renderer
    // does not block file picks on captcha; main gate happens at submit time).
    if (detail.settings.enableTurnstile) {
      const tok = String(form.get("turnstileToken") ?? "");
      if (tok) {
        const ok = await verifyTurnstile(tok, ip);
        if (!ok) return err(400, "Captcha verification failed.");
      }
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
      const sanitized = DOMPurify.sanitize(buffer.toString("utf8"), {
        USE_PROFILES: { svg: true, svgFilters: true },
      });
      buffer = Buffer.from(sanitized, "utf8");
    }

    const kind = kindFromMime(mime);
    if (!kind) return err(400, "File type not allowed.");

    const fileId = randomUUID();
    const ext = extFromMime(mime);
    const storagePath = buildStoragePath(fileId, ext);
    await writeUpload(storagePath, buffer);

    const row = await insertFile({
      filename: original,
      storagePath,
      mimeType: mime,
      sizeBytes: buffer.length,
      kind,
      uploadedBy: `form-submission:${id}`,
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
