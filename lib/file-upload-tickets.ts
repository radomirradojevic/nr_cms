import "server-only";

export type { ClientUploadTicketPayload } from "@/lib/file-upload-tickets-core";
export {
  createClientUploadTicket,
  verifyClientUploadTicket,
} from "@/lib/file-upload-tickets-core";
