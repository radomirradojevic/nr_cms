import "server-only";
import { mkdir, writeFile, unlink, stat, readFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import type { Readable } from "node:stream";

/**
 * Storage layer abstraction.
 *
 * The CMS supports two deployment modes out of the box:
 *
 *  - `local`        — local-filesystem implementation (default, used by
 *                     self-hosted deployments).
 *  - `vercel-blob`  — Vercel Blob, for serverless deployments where the
 *                     filesystem is read-only outside of the ephemeral
 *                     `/tmp` directory.
 *
 * Selection is controlled by the `STORAGE_PROVIDER` environment variable.
 * When unset, the loader auto-detects: it picks `vercel-blob` when running
 * on Vercel (`VERCEL=1`) with a `BLOB_READ_WRITE_TOKEN` present, otherwise
 * it falls back to `local` so existing self-hosted setups keep working
 * without any config changes.
 *
 * The architecture is intentionally provider-agnostic: adding a future
 * provider (S3, Cloudflare R2, Supabase Storage, …) is a matter of
 * implementing the {@link StorageProvider} interface and registering it in
 * {@link buildProvider} / {@link resolveProviderName}.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type StorageProviderName = "local" | "vercel-blob";

export interface StorageWriteOptions {
  /** MIME type to associate with the stored object. */
  contentType?: string;
}

export interface StorageReadResult {
  /**
   * If set, the consumer (e.g. `/api/files/[id]`) should redirect the client
   * to this absolute URL instead of streaming the bytes through the server.
   * Used by remote object stores that expose public URLs.
   */
  redirectUrl?: string;
  /**
   * Otherwise, a Node.js readable stream of the object's bytes. Mutually
   * exclusive with {@link redirectUrl}.
   */
  stream?: Readable;
  /** Size of the object in bytes. */
  size: number;
  /** Best-effort content type if the provider knows it. */
  contentType?: string;
}

export interface StorageProvider {
  /** Identifier for diagnostics and conditional logic. */
  readonly name: StorageProviderName;
  /** Hard upload-size cap enforced by the platform/provider, in bytes. */
  readonly maxUploadBytes: number;
  /**
   * Whether {@link read} returns a redirect URL. When true the API route
   * should issue an HTTP redirect; when false it should pipe the stream
   * back.
   */
  readonly servesViaRedirect: boolean;

  /**
   * Build the stable object key/path stored in the database
   * (`files.storage_path` column). The shape (`YYYY/MM/uuid.ext`) is shared
   * across providers so historical rows remain valid if you migrate later.
   */
  buildKey(id: string, ext: string, date?: Date): string;

  write(key: string, data: Buffer, opts?: StorageWriteOptions): Promise<void>;
  delete(key: string): Promise<void>;
  stat(key: string): Promise<{ size: number }>;
  read(key: string): Promise<StorageReadResult>;
  /** Read the full object into a Buffer (used for email attachments). */
  readBuffer(key: string): Promise<Buffer>;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export function buildStoragePath(id: string, ext: string, date = new Date()) {
  const yyyy = date.getUTCFullYear().toString();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}/${mm}/${id}.${ext}`;
}

function sanitizeKey(key: string): string {
  return key.replace(/\\/g, "/").replace(/\.\.+/g, "");
}

// ---------------------------------------------------------------------------
// Local provider (self-hosted, default)
// ---------------------------------------------------------------------------

export function getUploadsDir(): string {
  return (
    process.env.UPLOADS_DIR ??
    path.join(/*turbopackIgnore: true*/ process.cwd(), "storage", "uploads")
  );
}

/**
 * Resolve a `storagePath` to an absolute path inside the uploads dir,
 * preventing path traversal. Local-filesystem only.
 */
export function resolvePath(storagePath: string): string {
  const root = path.resolve(getUploadsDir());
  const safe = sanitizeKey(storagePath);
  const full = path.resolve(root, safe);
  if (!full.startsWith(root)) {
    throw new Error("Invalid storage path");
  }
  return full;
}

// Match the `proxyClientMaxBodySize` ceiling in `next.config.ts` so that
// the File Manager's per-file MAX_FILE_SIZE (300 MB) is fully usable on
// self-hosted deployments fronted by the Next.js proxy.
const LOCAL_MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

const localProvider: StorageProvider = {
  name: "local",
  maxUploadBytes: LOCAL_MAX_UPLOAD_BYTES,
  servesViaRedirect: false,
  buildKey: buildStoragePath,
  async write(key, data) {
    const full = resolvePath(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  },
  async delete(key) {
    try {
      await unlink(resolvePath(key));
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== "ENOENT") {
        console.error("[file-storage:local] delete failed:", err);
      }
    }
  },
  async stat(key) {
    const s = await stat(resolvePath(key));
    return { size: s.size };
  },
  async read(key) {
    const full = resolvePath(key);
    const s = await stat(full);
    return { stream: createReadStream(full), size: s.size };
  },
  async readBuffer(key) {
    return readFile(resolvePath(key));
  },
};

// ---------------------------------------------------------------------------
// Vercel Blob provider
// ---------------------------------------------------------------------------

// Vercel serverless functions cap request bodies at ~4.5 MB by default;
// with Fluid Compute enabled the practical limit is significantly higher
// (Vercel still recommends client-side direct uploads beyond ~100 MB).
const VERCEL_DEFAULT_BODY_LIMIT = 4.5 * 1024 * 1024;
const VERCEL_FLUID_BODY_LIMIT = 200 * 1024 * 1024;

function getVercelBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set. It is required when STORAGE_PROVIDER=vercel-blob.",
    );
  }
  return token;
}

function getVercelMaxUploadBytes(): number {
  const override = process.env.VERCEL_BLOB_MAX_UPLOAD_BYTES;
  if (override) {
    const n = Number(override);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  if (process.env.VERCEL_FLUID_COMPUTE === "1") {
    return VERCEL_FLUID_BODY_LIMIT;
  }
  return VERCEL_DEFAULT_BODY_LIMIT;
}

const vercelBlobProvider: StorageProvider = {
  name: "vercel-blob",
  servesViaRedirect: true,
  get maxUploadBytes() {
    return getVercelMaxUploadBytes();
  },
  buildKey: buildStoragePath,
  async write(key, data, opts) {
    const { put } = await import("@vercel/blob");
    await put(sanitizeKey(key), data, {
      access: "public",
      contentType: opts?.contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
      token: getVercelBlobToken(),
    });
  },
  async delete(key) {
    try {
      const { del, head } = await import("@vercel/blob");
      const meta = await head(sanitizeKey(key), {
        token: getVercelBlobToken(),
      });
      await del(meta.url, { token: getVercelBlobToken() });
    } catch (err) {
      // Treat missing blobs as already-deleted (parity with local provider).
      const msg = err instanceof Error ? err.message : String(err);
      if (!/not[\s_-]*found/i.test(msg)) {
        console.error("[file-storage:vercel-blob] delete failed:", err);
      }
    }
  },
  async stat(key) {
    const { head } = await import("@vercel/blob");
    const meta = await head(sanitizeKey(key), {
      token: getVercelBlobToken(),
    });
    return { size: meta.size };
  },
  async read(key) {
    const { head } = await import("@vercel/blob");
    const meta = await head(sanitizeKey(key), {
      token: getVercelBlobToken(),
    });
    return {
      redirectUrl: meta.url,
      size: meta.size,
      contentType: meta.contentType ?? undefined,
    };
  },
  async readBuffer(key) {
    const { head } = await import("@vercel/blob");
    const meta = await head(sanitizeKey(key), {
      token: getVercelBlobToken(),
    });
    const res = await fetch(meta.url);
    if (!res.ok) {
      throw new Error(
        `[file-storage:vercel-blob] download failed (${res.status} ${res.statusText})`,
      );
    }
    return Buffer.from(await res.arrayBuffer());
  },
};

// ---------------------------------------------------------------------------
// Provider selection
// ---------------------------------------------------------------------------

function resolveProviderName(): StorageProviderName {
  const explicit = process.env.STORAGE_PROVIDER?.toLowerCase().trim();
  if (explicit === "local" || explicit === "vercel-blob") return explicit;
  if (explicit && explicit.length > 0) {
    throw new Error(
      `Unknown STORAGE_PROVIDER "${explicit}". Expected "local" or "vercel-blob".`,
    );
  }
  // Auto-detect: on Vercel with a blob token, prefer vercel-blob.
  if (process.env.VERCEL === "1" && process.env.BLOB_READ_WRITE_TOKEN) {
    return "vercel-blob";
  }
  return "local";
}

function buildProvider(name: StorageProviderName): StorageProvider {
  switch (name) {
    case "vercel-blob":
      return vercelBlobProvider;
    case "local":
    default:
      return localProvider;
  }
}

let cachedProvider: StorageProvider | undefined;

export function getStorageProvider(): StorageProvider {
  if (!cachedProvider) {
    cachedProvider = buildProvider(resolveProviderName());
  }
  return cachedProvider;
}

/** Test/admin hook — clears the memoised provider so envs can be re-read. */
export function resetStorageProviderCache(): void {
  cachedProvider = undefined;
}

// ---------------------------------------------------------------------------
// Backward-compatible top-level helpers used across the codebase
// ---------------------------------------------------------------------------

export async function writeUpload(
  storagePath: string,
  data: Buffer,
  opts?: StorageWriteOptions,
): Promise<void> {
  await getStorageProvider().write(storagePath, data, opts);
}

export async function deleteUpload(storagePath: string): Promise<void> {
  await getStorageProvider().delete(storagePath);
}

export async function statUpload(storagePath: string) {
  return getStorageProvider().stat(storagePath);
}

export async function readUpload(
  storagePath: string,
): Promise<StorageReadResult> {
  return getStorageProvider().read(storagePath);
}

export async function readUploadBuffer(storagePath: string): Promise<Buffer> {
  return getStorageProvider().readBuffer(storagePath);
}

/**
 * @deprecated Local-filesystem only. Prefer {@link readUpload} (works with
 * any provider). Retained for the (now refactored) `/api/files/[id]` route
 * so callers that strictly need a Node stream against the local provider
 * keep working.
 */
export function readUploadStream(storagePath: string) {
  return createReadStream(resolvePath(storagePath));
}

export function getMaxUploadBytes(): number {
  return getStorageProvider().maxUploadBytes;
}

export function getStorageProviderName(): StorageProviderName {
  return getStorageProvider().name;
}
