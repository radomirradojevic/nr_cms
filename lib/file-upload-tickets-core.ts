import { createHmac, timingSafeEqual } from "node:crypto";
import type { FileKind } from "@/lib/file-manager";

const TICKET_VERSION = 1;

export type ClientUploadTicketPayload = {
  v: typeof TICKET_VERSION;
  id: string;
  storagePath: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  kind: FileKind;
  folderId?: string | null;
  uploadedBy: string;
  exp: number;
};

function getTicketSecret(): string {
  const secret = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!secret) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for upload tickets.");
  }
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getTicketSecret())
    .update(value)
    .digest("base64url");
}

export function createClientUploadTicket(
  payload: Omit<ClientUploadTicketPayload, "v">,
): string {
  const encoded = Buffer.from(
    JSON.stringify({ ...payload, v: TICKET_VERSION }),
    "utf8",
  ).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyClientUploadTicket(
  ticket: string,
): ClientUploadTicketPayload | null {
  const [encoded, signature] = ticket.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  let payload: ClientUploadTicketPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as ClientUploadTicketPayload;
  } catch {
    return null;
  }

  if (payload.v !== TICKET_VERSION || payload.exp < Date.now()) return null;
  return payload;
}
