import { mkdir, writeFile, unlink, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";

export function getUploadsDir(): string {
  return (
    process.env.UPLOADS_DIR ?? path.join(process.cwd(), "storage", "uploads")
  );
}

export function resolvePath(storagePath: string): string {
  // Prevent path traversal: normalize and ensure final path is inside uploads dir.
  const root = path.resolve(getUploadsDir());
  const safe = storagePath.replace(/\\/g, "/").replace(/\.\.+/g, "");
  const full = path.resolve(root, safe);
  if (!full.startsWith(root)) {
    throw new Error("Invalid storage path");
  }
  return full;
}

export function buildStoragePath(id: string, ext: string, date = new Date()) {
  const yyyy = date.getUTCFullYear().toString();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}/${mm}/${id}.${ext}`;
}

export async function writeUpload(
  storagePath: string,
  data: Buffer,
): Promise<void> {
  const full = resolvePath(storagePath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
}

export async function deleteUpload(storagePath: string): Promise<void> {
  try {
    await unlink(resolvePath(storagePath));
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== "ENOENT") {
      console.error("[deleteUpload] unlink failed:", err);
    }
  }
}

export async function statUpload(storagePath: string) {
  return stat(resolvePath(storagePath));
}

export function readUploadStream(storagePath: string) {
  return createReadStream(resolvePath(storagePath));
}
