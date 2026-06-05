import type { Role } from "@/lib/roles";
import {
  hasElevatedContentWorkflowRole,
  type ContentStatus,
} from "@/lib/content-status";

export type ContentScheduleDateInput = string | Date | null | undefined;

export type ContentScheduleFields = {
  status: string;
  publishAt?: string | Date | null;
  unpublishAt?: string | Date | null;
};

export type ContentScheduleState = "scheduled" | "live_until" | "expired";

type ParsedScheduleDate =
  | { ok: true; provided: boolean; value?: Date | null }
  | { ok: false; error: string };

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseScheduleDate(
  value: ContentScheduleDateInput,
  label: string,
): ParsedScheduleDate {
  if (value === undefined) return { ok: true, provided: false };
  if (value === null || value === "") {
    return { ok: true, provided: true, value: null };
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: `${label} must be a valid date and time.` };
  }
  return { ok: true, provided: true, value: date };
}

export function isContentLive(
  row: ContentScheduleFields,
  now = new Date(),
): boolean {
  const publishAt = toDate(row.publishAt);
  const unpublishAt = toDate(row.unpublishAt);

  return (
    row.status === "published" &&
    (!publishAt || publishAt <= now) &&
    (!unpublishAt || unpublishAt > now)
  );
}

export function getContentScheduleState(
  row: ContentScheduleFields,
  now = new Date(),
): ContentScheduleState | null {
  const publishAt = toDate(row.publishAt);
  const unpublishAt = toDate(row.unpublishAt);

  if (
    (row.status === "approved" || row.status === "published") &&
    publishAt &&
    publishAt > now
  ) {
    return "scheduled";
  }

  if (row.status === "published" && unpublishAt) {
    return unpublishAt <= now ? "expired" : "live_until";
  }

  return null;
}

export function normalizeContentScheduleForWrite(input: {
  actorRoles: readonly Role[];
  status: ContentStatus;
  publishAtInput?: ContentScheduleDateInput;
  unpublishAtInput?: ContentScheduleDateInput;
  currentPublishAt?: Date | null;
  currentUnpublishAt?: Date | null;
  now?: Date;
}):
  | {
      ok: true;
      publishAt: Date | null;
      unpublishAt: Date | null;
      ignoredInput: boolean;
    }
  | { ok: false; error: string } {
  const now = input.now ?? new Date();

  if (!hasElevatedContentWorkflowRole(input.actorRoles)) {
    return {
      ok: true,
      publishAt: null,
      unpublishAt: null,
      ignoredInput:
        input.publishAtInput !== undefined ||
        input.unpublishAtInput !== undefined,
    };
  }

  const parsedPublishAt = parseScheduleDate(input.publishAtInput, "Publish at");
  if (!parsedPublishAt.ok) return parsedPublishAt;
  const parsedUnpublishAt = parseScheduleDate(
    input.unpublishAtInput,
    "Unpublish at",
  );
  if (!parsedUnpublishAt.ok) return parsedUnpublishAt;

  if (
    input.status === "draft" ||
    input.status === "in_review" ||
    input.status === "archived"
  ) {
    return {
      ok: true,
      publishAt: null,
      unpublishAt: null,
      ignoredInput: false,
    };
  }

  let publishAt = parsedPublishAt.provided
    ? (parsedPublishAt.value ?? null)
    : (input.currentPublishAt ?? null);
  const unpublishAt = parsedUnpublishAt.provided
    ? (parsedUnpublishAt.value ?? null)
    : (input.currentUnpublishAt ?? null);

  if (publishAt && unpublishAt && unpublishAt <= publishAt) {
    return { ok: false, error: "Unpublish at must be after publish at." };
  }

  if (unpublishAt && unpublishAt <= now) {
    return { ok: false, error: "Unpublish at must be in the future." };
  }

  if (input.status === "published") {
    if (publishAt && publishAt > now) {
      return {
        ok: false,
        error:
          "Use Approved status when scheduling a future publish. Published content must be live now.",
      };
    }
    publishAt = null;
  }

  if (input.status === "approved" && unpublishAt && !publishAt) {
    return {
      ok: false,
      error:
        "Set publish at before setting an unpublish date on approved content.",
    };
  }

  return { ok: true, publishAt, unpublishAt, ignoredInput: false };
}

export function normalizeContentScheduleForRestore(input: {
  actorRoles: readonly Role[];
  status: ContentStatus;
  publishAtInput?: ContentScheduleDateInput;
  unpublishAtInput?: ContentScheduleDateInput;
  now?: Date;
}):
  | {
      ok: true;
      publishAt: Date | null;
      unpublishAt: Date | null;
      ignoredInput: boolean;
      sanitized: boolean;
    }
  | { ok: false; error: string } {
  const now = input.now ?? new Date();

  if (!hasElevatedContentWorkflowRole(input.actorRoles)) {
    const ignoredInput =
      input.publishAtInput !== undefined ||
      input.unpublishAtInput !== undefined;
    return {
      ok: true,
      publishAt: null,
      unpublishAt: null,
      ignoredInput,
      sanitized: ignoredInput,
    };
  }

  const parsedPublishAt = parseScheduleDate(input.publishAtInput, "Publish at");
  if (!parsedPublishAt.ok) return parsedPublishAt;
  const parsedUnpublishAt = parseScheduleDate(
    input.unpublishAtInput,
    "Unpublish at",
  );
  if (!parsedUnpublishAt.ok) return parsedUnpublishAt;

  let publishAt = parsedPublishAt.value ?? null;
  let unpublishAt = parsedUnpublishAt.value ?? null;
  let sanitized = false;

  if (
    input.status === "draft" ||
    input.status === "in_review" ||
    input.status === "archived"
  ) {
    return {
      ok: true,
      publishAt: null,
      unpublishAt: null,
      ignoredInput: false,
      sanitized: Boolean(publishAt || unpublishAt),
    };
  }

  if (unpublishAt && publishAt && unpublishAt <= publishAt) {
    unpublishAt = null;
    sanitized = true;
  }

  if (unpublishAt && unpublishAt <= now) {
    unpublishAt = null;
    sanitized = true;
  }

  if (input.status === "published") {
    if (publishAt) {
      publishAt = null;
      sanitized = true;
    }
    return {
      ok: true,
      publishAt,
      unpublishAt,
      ignoredInput: false,
      sanitized,
    };
  }

  if (input.status === "approved") {
    if (publishAt && publishAt <= now) {
      publishAt = null;
      sanitized = true;
    }
    if (unpublishAt && !publishAt) {
      unpublishAt = null;
      sanitized = true;
    }
  }

  return {
    ok: true,
    publishAt,
    unpublishAt,
    ignoredInput: false,
    sanitized,
  };
}
