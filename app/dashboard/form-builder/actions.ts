"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getBackendUserOptionById } from "@/lib/backend-users";
import { getRoles, hasRole } from "@/lib/roles";
import {
  bulkDeleteSubmissions,
  bulkUpdateSubmissionStatus,
  createForm as createFormRow,
  deleteForm as deleteFormRow,
  deleteSubmission as deleteSubmissionRow,
  FIELD_TYPES,
  getFormById,
  getSubmissionById,
  listForms,
  listPublishedFormsForPicker,
  listSubmissions,
  publishForm as publishFormRow,
  reassignForm as reassignFormRow,
  replaceFormFields,
  unpublishForm as unpublishFormRow,
  updateForm as updateFormRow,
  updateSubmissionStatus,
  upsertFormSettings,
  type FieldInput,
  type FieldType,
  type FormFieldRow,
  type FormStatus,
  type SubmissionStatus,
} from "@/data/forms";
import {
  getLock as getFormLock,
  isLockedBy as isFormLockedBy,
  listActiveLocksForFormIds,
  logLockEvent,
} from "@/data/form-locks";
import { getGlobalSettings } from "@/data/global-settings";
import {
  dateOnlyToUtcEndExclusive,
  dateOnlyToUtcStart,
  formatRegionalDateTime,
} from "@/lib/regional-settings";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<{
  userId: string;
  sessionId: string;
} | null> {
  const { userId, sessionId } = await auth();
  if (!userId || !sessionId) return null;
  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) return null;
  return { userId, sessionId };
}

async function requireFormLock(
  formId: string,
  caller: { userId: string; sessionId: string },
  lockClientId: string | null | undefined,
) {
  if (!lockClientId) {
    return {
      error: "Your edit lock is not active. Reload the form and try again.",
      code: "LOCK_LOST" as const,
    };
  }
  const locked = await isFormLockedBy({
    formId,
    userId: caller.userId,
    sessionId: caller.sessionId,
    clientId: lockClientId,
  });
  if (!locked) {
    await logLockEvent({
      formId,
      userId: caller.userId,
      event: "save_rejected_stale",
      metadata: { sessionId: caller.sessionId, clientId: lockClientId },
    });
    return {
      error:
        "Your edit lock expired or was released. Reload the form before saving.",
      code: "LOCK_LOST" as const,
    };
  }
  return null;
}

async function getListActionLockError(formId: string): Promise<string | null> {
  const lock = await getFormLock(formId);
  if (!lock) return null;
  return `This form is currently being edited by ${lock.userDisplayName}. Wait until the current editor closes the page.`;
}

function bumpForm(id: string) {
  revalidatePath("/dashboard/form-builder");
  revalidatePath(`/dashboard/form-builder/${id}`);
  revalidatePath(`/dashboard/form-builder/${id}/submissions`);
  // Write-through invalidation; see top-menu actions for the rationale.
  updateTag(`form:${id}`);
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  description: z.string().trim().max(1000).optional().nullable(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  submitLabel: z.string().trim().min(1).max(60).optional(),
  successMessage: z.string().trim().min(1).max(2000).optional(),
  lockClientId: z.string().min(1).max(128).optional(),
});

const fieldKeyRe = /^[a-z][a-z0-9_]*$/;
const fieldTypeSchema = z.enum(FIELD_TYPES as [FieldType, ...FieldType[]]);

const fieldSchema = z.object({
  id: z.string().uuid().optional(),
  fieldKey: z
    .string()
    .min(1)
    .max(64)
    .refine((v) => fieldKeyRe.test(v), "Invalid field key"),
  fieldType: fieldTypeSchema,
  label: z.string().trim().min(1).max(200),
  placeholder: z.string().trim().max(200).optional().nullable(),
  helpText: z.string().trim().max(500).optional().nullable(),
  required: z.boolean(),
  position: z.number().int().nonnegative(),
  options: z
    .object({
      choices: z
        .array(
          z.object({
            value: z.string().min(1).max(120),
            label: z.string().min(1).max(200),
          }),
        )
        .max(100)
        .optional(),
    })
    .optional()
    .nullable(),
  validation: z
    .object({
      minLength: z.number().int().nonnegative().optional(),
      maxLength: z.number().int().positive().max(50000).optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().max(500).optional(),
      accept: z.array(z.string().max(127)).max(20).optional(),
      maxFileSizeKb: z.number().int().positive().max(307200).optional(),
    })
    .optional()
    .nullable(),
});

const saveFieldsSchema = z.object({
  formId: z.string().uuid(),
  fields: z.array(fieldSchema).max(100),
  lockClientId: z.string().min(1).max(128).optional(),
});

const settingsSchema = z.object({
  formId: z.string().uuid(),
  enableEmailNotifications: z.boolean(),
  notificationRecipients: z.array(z.string().email()).max(10),
  notificationSubject: z.string().trim().min(1).max(255),
  replyToField: z.string().max(64).optional().nullable(),
  emailTemplate: z.string().max(20000),
  redirectUrl: z.string().max(2000).optional().nullable(),
  enableTurnstile: z.boolean(),
  lockClientId: z.string().min(1).max(128).optional(),
});

const idSchema = z.object({ id: z.string().uuid() });
const lockedIdSchema = idSchema.extend({
  lockClientId: z.string().min(1).max(128).optional(),
});
const subStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "read", "spam"]),
});
const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  action: z.enum(["mark_read", "mark_new", "mark_spam", "delete"]),
});

// ─── Public exports ───────────────────────────────────────────────────────────

export async function createForm(input: z.input<typeof createSchema>) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." };
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const row = await createFormRow(
      { name: parsed.data.name, description: parsed.data.description ?? null },
      caller,
    );
    revalidatePath("/dashboard/form-builder");
    return { success: true as const, id: row.id, slug: row.slug };
  } catch (err) {
    console.error("[createForm]", err);
    return { error: "Could not create form." };
  }
}

export async function updateForm(input: z.input<typeof updateSchema>) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." };
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const lockError = await requireFormLock(
      parsed.data.id,
      caller,
      parsed.data.lockClientId,
    );
    if (lockError) return lockError;

    const { id, lockClientId: _lockClientId, ...patch } = parsed.data;
    void _lockClientId;
    const row = await updateFormRow(id, patch, caller);
    if (!row) return { error: "Form not found." };
    bumpForm(id);
    return { success: true as const };
  } catch (err) {
    console.error("[updateForm]", err);
    return { error: "Could not update form." };
  }
}

export async function saveFormFields(input: z.input<typeof saveFieldsSchema>) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." };
  const parsed = saveFieldsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const lockError = await requireFormLock(
    parsed.data.formId,
    caller,
    parsed.data.lockClientId,
  );
  if (lockError) return lockError;

  // Reject duplicate field_keys explicitly.
  const seen = new Set<string>();
  for (const f of parsed.data.fields) {
    if (seen.has(f.fieldKey))
      return { error: `Duplicate field key "${f.fieldKey}".` };
    seen.add(f.fieldKey);
  }
  // Re-number positions to be strictly 0..n-1
  const fields: FieldInput[] = parsed.data.fields
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((f, i) => ({
      id: f.id,
      fieldKey: f.fieldKey,
      fieldType: f.fieldType as FieldType,
      label: f.label,
      placeholder: f.placeholder ?? null,
      helpText: f.helpText ?? null,
      required: f.required,
      position: i,
      options: f.options ?? null,
      validation: f.validation ?? null,
    }));

  try {
    await replaceFormFields(parsed.data.formId, fields, caller);
    bumpForm(parsed.data.formId);
    return { success: true as const };
  } catch (err) {
    console.error("[saveFormFields]", err);
    return { error: "Could not save fields." };
  }
}

export async function saveFormSettings(input: z.input<typeof settingsSchema>) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." };
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const lockError = await requireFormLock(
    parsed.data.formId,
    caller,
    parsed.data.lockClientId,
  );
  if (lockError) return lockError;

  // Reject cross-origin redirect URLs (must be relative path or same-origin).
  if (parsed.data.redirectUrl) {
    const v = parsed.data.redirectUrl.trim();
    if (v.length > 0) {
      if (
        v.startsWith("javascript:") ||
        v.startsWith("data:") ||
        /^https?:\/\//i.test(v)
      ) {
        return {
          error: "Redirect URL must be a same-origin path (e.g. /thanks).",
        };
      }
      if (!v.startsWith("/")) {
        return { error: "Redirect URL must start with /." };
      }
    }
  }

  try {
    await upsertFormSettings(
      parsed.data.formId,
      {
        enableEmailNotifications: parsed.data.enableEmailNotifications,
        notificationRecipients: parsed.data.notificationRecipients,
        notificationSubject: parsed.data.notificationSubject,
        replyToField: parsed.data.replyToField ?? null,
        emailTemplate: parsed.data.emailTemplate,
        redirectUrl: parsed.data.redirectUrl?.trim() || null,
        enableTurnstile: parsed.data.enableTurnstile,
      },
      caller,
    );
    bumpForm(parsed.data.formId);
    return { success: true as const };
  } catch (err) {
    console.error("[saveFormSettings]", err);
    return { error: "Could not save settings." };
  }
}

export async function publishForm(input: z.input<typeof lockedIdSchema>) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." };
  const parsed = lockedIdSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid id." };
  const lockError = await requireFormLock(
    parsed.data.id,
    caller,
    parsed.data.lockClientId,
  );
  if (lockError) return lockError;

  // Sanity check: form must have ≥ 1 field.
  const detail = await getFormById(parsed.data.id);
  if (!detail) return { error: "Form not found." };
  if (detail.fields.length === 0)
    return { error: "Add at least one field before publishing." };

  await publishFormRow(parsed.data.id, caller);
  bumpForm(parsed.data.id);
  return { success: true as const };
}

export async function unpublishForm(input: z.input<typeof lockedIdSchema>) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." };
  const parsed = lockedIdSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid id." };
  const lockError = await requireFormLock(
    parsed.data.id,
    caller,
    parsed.data.lockClientId,
  );
  if (lockError) return lockError;
  await unpublishFormRow(parsed.data.id, caller);
  bumpForm(parsed.data.id);
  return { success: true as const };
}

export async function deleteForm(input: z.input<typeof idSchema>) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." };
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid id." };
  const lockError = await getListActionLockError(parsed.data.id);
  if (lockError) return { error: lockError };
  const ok = await deleteFormRow(parsed.data.id);
  if (!ok) return { error: "Form not found." };
  revalidatePath("/dashboard/form-builder");
  updateTag(`form:${parsed.data.id}`);
  return { success: true as const };
}

// ─── Reassign ─────────────────────────────────────────────────────────────────

const reassignSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().min(1, "Owner is required."),
});

export async function reassignForm(input: z.input<typeof reassignSchema>) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." };
  const parsed = reassignSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const lockError = await getListActionLockError(parsed.data.id);
  if (lockError) return { error: lockError };

  const owner = await getBackendUserOptionById(parsed.data.ownerId);
  if (!owner) return { error: "Target user must be a backend user." };

  try {
    const row = await reassignFormRow(
      parsed.data.id,
      parsed.data.ownerId,
      caller,
    );
    if (!row) return { error: "Form not found." };
    bumpForm(parsed.data.id);
    return { success: true as const };
  } catch (err) {
    console.error("[reassignForm]", err);
    return { error: "Could not reassign form." };
  }
}

// ─── Submission moderation ────────────────────────────────────────────────────

export async function setSubmissionStatus(
  input: z.input<typeof subStatusSchema>,
) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." };
  const parsed = subStatusSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };
  const sub = await getSubmissionById(parsed.data.id);
  if (!sub) return { error: "Submission not found." };
  await updateSubmissionStatus(parsed.data.id, parsed.data.status);
  revalidatePath(`/dashboard/form-builder/${sub.form.id}/submissions`);
  return { success: true as const };
}

export async function deleteSubmission(input: z.input<typeof idSchema>) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." };
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid id." };
  const sub = await getSubmissionById(parsed.data.id);
  if (!sub) return { error: "Submission not found." };
  await deleteSubmissionRow(parsed.data.id);
  revalidatePath(`/dashboard/form-builder/${sub.form.id}/submissions`);
  return { success: true as const };
}

export async function bulkSubmissionAction(input: z.input<typeof bulkSchema>) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." };
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  let count = 0;
  switch (parsed.data.action) {
    case "mark_read":
      count = await bulkUpdateSubmissionStatus(parsed.data.ids, "read");
      break;
    case "mark_new":
      count = await bulkUpdateSubmissionStatus(parsed.data.ids, "new");
      break;
    case "mark_spam":
      count = await bulkUpdateSubmissionStatus(parsed.data.ids, "spam");
      break;
    case "delete":
      count = await bulkDeleteSubmissions(parsed.data.ids);
      break;
  }
  revalidatePath("/dashboard/form-builder", "layout");
  return { success: true as const, count };
}

// ─── Pickers / data fetching for client UIs ──────────────────────────────────

export async function fetchFormsForPicker(input?: { search?: string }) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." };
  const rows = await listPublishedFormsForPicker(input?.search);
  return { rows };
}

export async function fetchFormPreview(input: { id: string }) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." } as const;
  const form = await getFormById(input.id);
  if (!form) return { error: "Not found." } as const;
  return {
    id: form.form.id,
    name: form.form.name,
    status: form.form.status as FormStatus,
    fieldCount: form.fields.length,
  } as const;
}

export async function fetchFormEditorPreview(input: { id: string }) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." } as const;
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid id." } as const;

  const detail = await getFormById(parsed.data.id);
  if (!detail) return { error: "Not found." } as const;

  return {
    success: true as const,
    form: {
      id: detail.form.id,
      name: detail.form.name,
      submitLabel: detail.form.submitLabel,
    },
    fields: detail.fields,
  };
}

export async function fetchFormSubmissionsEditorPreview(input: {
  formId: string;
  limit?: number;
}) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." } as const;
  const parsed = z
    .object({
      formId: z.string().uuid(),
      limit: z.number().int().min(1).max(5).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Invalid input." } as const;

  const detail = await getFormById(parsed.data.formId);
  if (!detail) return { error: "Form not found." } as const;

  const limit = parsed.data.limit ?? 3;
  const { rows, total } = await listSubmissions({
    formId: parsed.data.formId,
    limit,
    offset: 0,
  });
  const sourceRows =
    rows.length > 0 ? rows : buildMockSubmissions(detail.fields);

  return {
    success: true as const,
    formName: detail.form.name,
    fields: detail.fields,
    submissions: sourceRows.slice(0, limit).map((row) => ({
      id: row.id,
      data: (row.data ?? {}) as Record<string, unknown>,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
    usingMock: rows.length === 0,
  };
}

export async function fetchFormsList(input: {
  search?: string;
  status?: FormStatus;
  createdBy?: string;
  limit: number;
  offset: number;
}) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." };
  const out = await listForms(input);
  const activeLocks = await listActiveLocksForFormIds(
    out.rows.map((r) => r.id),
  );

  const userIds = [
    ...new Set(
      out.rows
        .flatMap((r) => [r.createdBy, r.updatedBy])
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const nameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const client = await clerkClient();
    await Promise.all(
      userIds.map(async (id) => {
        const u = await client.users.getUser(id).catch(() => null);
        if (u) {
          nameMap.set(
            id,
            u.fullName ||
              u.username ||
              u.primaryEmailAddress?.emailAddress ||
              id,
          );
        }
      }),
    );
  }

  return {
    ...out,
    rows: out.rows.map((r) => ({
      ...r,
      createdByName: r.createdBy ? (nameMap.get(r.createdBy) ?? null) : null,
      updatedByName: r.updatedBy ? (nameMap.get(r.updatedBy) ?? null) : null,
      editLock: activeLocks.get(r.id) ?? null,
    })),
  };
}

export async function fetchSubmissions(input: {
  formId: string;
  status?: SubmissionStatus;
  fromDate?: string;
  toDate?: string;
  search?: string;
  limit: number;
  offset: number;
}) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." };
  const settings = await getGlobalSettings();
  const fromDate = dateOnlyToUtcStart(
    input.fromDate,
    settings.regional.timezone,
  );
  const toDateExclusive = dateOnlyToUtcEndExclusive(
    input.toDate,
    settings.regional.timezone,
  );
  const out = await listSubmissions({
    formId: input.formId,
    status: input.status,
    fromDate,
    toDateExclusive,
    search: input.search,
    limit: input.limit,
    offset: input.offset,
  });
  return out;
}

export async function exportSubmissionsCsvAction(input: {
  formId: string;
  status?: SubmissionStatus;
  fromDate?: string;
  toDate?: string;
  search?: string;
}) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." };
  const detail = await getFormById(input.formId);
  if (!detail) return { error: "Form not found." };

  const settings = await getGlobalSettings();
  const fromDate = dateOnlyToUtcStart(
    input.fromDate,
    settings.regional.timezone,
  );
  const toDateExclusive = dateOnlyToUtcEndExclusive(
    input.toDate,
    settings.regional.timezone,
  );

  const { rows } = await listSubmissions({
    formId: input.formId,
    status: input.status,
    fromDate,
    toDateExclusive,
    search: input.search,
    limit: 5000,
    offset: 0,
  });

  const headers = [
    "created_at_utc",
    "created_at_local",
    "status",
    "email_status",
    "ip_hash",
    ...detail.fields.map((f: FormFieldRow) => f.fieldKey),
  ];
  const lines: string[] = [headers.map(csvEscape).join(",")];
  for (const r of rows) {
    const data = (r.data ?? {}) as Record<string, unknown>;
    const row = [
      r.createdAt.toISOString(),
      formatRegionalDateTime(r.createdAt, settings.regional),
      r.status,
      r.emailStatus,
      r.ipHash ?? "",
      ...detail.fields.map((f: FormFieldRow) => csvSerialize(data[f.fieldKey])),
    ];
    lines.push(row.map(csvEscape).join(","));
  }
  const csv = lines.join("\r\n") + "\r\n";
  return { csv };
}

function csvEscape(v: string): string {
  const s = String(v ?? "");
  if (
    s.includes('"') ||
    s.includes(",") ||
    s.includes("\n") ||
    s.includes("\r")
  ) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvSerialize(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map((x) => csvSerialize(x)).join("; ");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("originalName" in o) {
      const sizeKb = typeof o.size === "number" ? Math.round(o.size / 1024) : 0;
      return `${String(o.originalName)} (${sizeKb} KB)`;
    }
    return JSON.stringify(o);
  }
  return String(v);
}

function buildMockSubmissions(fields: FormFieldRow[]) {
  const previewFields = fields.slice(0, 4);
  const now = Date.now();

  return [0, 1, 2].map((rowIndex) => ({
    id: `preview-${rowIndex + 1}`,
    data: Object.fromEntries(
      previewFields.map((field, fieldIndex) => [
        field.fieldKey,
        mockValueForField(field, rowIndex, fieldIndex),
      ]),
    ),
    createdAt: new Date(now - rowIndex * 60 * 60 * 1000),
  }));
}

function mockValueForField(
  field: FormFieldRow,
  rowIndex: number,
  fieldIndex: number,
) {
  const choices = (
    (field.options ?? {}) as {
      choices?: { value: string; label: string }[];
    }
  ).choices;

  switch (field.fieldType) {
    case "email":
      return `person${rowIndex + 1}@example.com`;
    case "phone":
      return `555-010${rowIndex}`;
    case "number":
      return rowIndex + fieldIndex + 1;
    case "date":
      return new Date(Date.now() - rowIndex * 86400000)
        .toISOString()
        .slice(0, 10);
    case "select":
    case "radio":
      return (
        choices?.[rowIndex % Math.max(choices.length, 1)]?.label ?? "Option"
      );
    case "checkbox":
      return choices && choices.length > 0
        ? [choices[rowIndex % choices.length]?.label ?? "Selected"]
        : rowIndex % 2 === 0;
    case "textarea":
      return `Sample ${field.label.toLowerCase()} response`;
    case "file":
      return { originalName: "sample-upload.pdf", size: 24576 };
    case "text":
    default:
      return `${field.label} ${rowIndex + 1}`;
  }
}
