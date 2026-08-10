export class RequestBodyTooLargeError extends Error {
  constructor() { super("request_body_too_large"); }
}

export async function readBoundedRequestBody(request: Request, maximumBytes: number): Promise<Buffer> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) throw new Error("request_body_limit_invalid");
  const declared = request.headers.get("content-length");
  if (declared && (!/^[0-9]+$/.test(declared) || Number(declared) > maximumBytes)) throw new RequestBodyTooLargeError();
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  try {
    for (;;) {
      const item = await reader.read(); if (item.done) break;
      total += item.value.byteLength;
      if (total > maximumBytes) { await reader.cancel(); throw new RequestBodyTooLargeError(); }
      chunks.push(item.value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), total);
}
