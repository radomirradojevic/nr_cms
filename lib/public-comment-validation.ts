import { publicMessage, type PublicMessage } from "@/lib/i18n/public-message";

export const PUBLIC_COMMENT_MAX_LENGTH = 5000;

export function validatePublicCommentInput(input: {
  body: string;
  guestName?: string;
  isSignedIn: boolean;
  maxLength?: number;
}): PublicMessage | null {
  const maxLength = input.maxLength ?? PUBLIC_COMMENT_MAX_LENGTH;
  const body = input.body.trim();

  if (body.length === 0) {
    return publicMessage(
      "public.comments.errors.required",
      "Comment cannot be empty.",
    );
  }

  if (body.length > maxLength) {
    return publicMessage(
      "public.comments.errors.tooLong",
      `Comment too long (max ${maxLength} characters).`,
      { max: maxLength },
    );
  }

  if (!input.isSignedIn && !input.guestName?.trim()) {
    return publicMessage(
      "public.comments.errors.nameRequired",
      "Name is required.",
    );
  }

  return null;
}

export function publicCommentRateLimitError(reason: string): PublicMessage {
  switch (reason) {
    case "Too many comments. Please wait a few minutes and try again.":
      return publicMessage("public.comments.errors.tooManyComments", reason);
    case "Daily comment limit reached. Try again tomorrow.":
      return publicMessage("public.comments.errors.dailyLimit", reason);
    case "Duplicate comment detected.":
      return publicMessage("public.comments.errors.duplicate", reason);
    default:
      return publicMessage("public.comments.errors.rateLimited", reason);
  }
}
