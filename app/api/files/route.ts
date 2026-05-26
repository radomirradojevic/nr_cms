import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles } from "@/lib/roles";
import { sanitizeSvgMarkup } from "@/lib/content-sanitizer";
import {
  ALLOWED_MIME,
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
import { insertFile } from "@/data/files";
import { getGlobalSettings } from "@/data/global-settings";

const ALLOWED_ROLES = ["admin", "publisher", "author"] as const;

// Allow long-running uploads (sniffing, SVG sanitize, disk write, DB insert).
export const maxDuration = 300;

type UploadResult =
  | { ok: true; file: Awaited<ReturnType<typeof insertFile>> }
  | { ok: false; filename: string; error: string };

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!roles.some((r) => (ALLOWED_ROLES as readonly string[]).includes(r))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    console.error("[POST /api/files] formData parse failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Invalid form data: ${err.message}`
            : "Invalid form data.",
      },
      { status: 400 },
    );
  }

  const entries = form.getAll("file");
  if (entries.length === 0) {
    return NextResponse.json({ error: "No files provided." }, { status: 400 });
  }

  const settings = await getGlobalSettings();
  // Effective limit is the smaller of the operator-configured cap and the
  // provider/platform hard cap (e.g. ~4.5 MB on Vercel without Fluid Compute).
  const providerMax = getMaxUploadBytes();
  const providerName = getStorageProviderName();
  const effectiveMax = Math.min(settings.maxUploadSizeBytes, providerMax);
  const results: UploadResult[] = [];

  for (const entry of entries) {
    if (!(entry instanceof File)) continue;
    const original = sanitizeFilename(entry.name || "file");

    try {
      if (entry.size > effectiveMax) {
        const hint =
          providerMax < settings.maxUploadSizeBytes
            ? providerName === "vercel-blob"
              ? ` (${providerName} request body limit; enable Vercel Fluid Compute or set VERCEL_FLUID_COMPUTE=1 / VERCEL_BLOB_MAX_UPLOAD_BYTES to raise it)`
              : ` (${providerName} provider limit)`
            : "";
        results.push({
          ok: false,
          filename: original,
          error: `File exceeds ${formatBytes(effectiveMax)} limit${hint}.`,
        });
        continue;
      }

      const arrayBuffer = await entry.arrayBuffer();
      let buffer = Buffer.from(arrayBuffer);

      // Sniff actual content type. file-type can't always detect text/* and svg.
      const sniffed = await fileTypeFromBuffer(buffer);
      let mime: string | null = sniffed?.mime ?? null;

      // Fallback for SVG and plain text where magic-byte detection may miss.
      if (!mime) {
        const head = buffer
          .slice(0, 1024)
          .toString("utf8")
          .trim()
          .toLowerCase();
        if (head.startsWith("<?xml") || head.startsWith("<svg")) {
          mime = "image/svg+xml";
        } else if (entry.type === "text/plain") {
          mime = "text/plain";
        }
      }

      if (!mime || !isMimeAllowed(mime)) {
        results.push({
          ok: false,
          filename: original,
          error: `File type ${mime ?? "unknown"} is not allowed.`,
        });
        continue;
      }

      // Sanitize SVG before writing to disk.
      if (mime === "image/svg+xml") {
        const sanitized = sanitizeSvgMarkup(buffer.toString("utf8"));
        buffer = Buffer.from(sanitized, "utf8");
      }

      const kind = kindFromMime(mime);
      if (!kind) {
        results.push({
          ok: false,
          filename: original,
          error: `File type ${mime} is not allowed.`,
        });
        continue;
      }

      const id = randomUUID();
      const ext = extFromMime(mime);
      const storagePath = buildStoragePath(id, ext);
      await writeUpload(storagePath, buffer, { contentType: mime });

      const row = await insertFile({
        filename: original,
        storagePath,
        mimeType: mime,
        sizeBytes: buffer.length,
        kind,
        uploadedBy: userId,
      });

      results.push({ ok: true, file: row });
    } catch (err) {
      console.error("[POST /api/files] upload failed:", err);
      results.push({
        ok: false,
        filename: original,
        error: "Upload failed. Please try again.",
      });
    }
  }

  return NextResponse.json({ results });
}

// Quiet unused warning; ALLOWED_MIME is re-exported for consumers but
// referenced indirectly via isMimeAllowed.
void ALLOWED_MIME;
