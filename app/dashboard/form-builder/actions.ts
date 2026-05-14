"use server";

import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

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

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<{ userId: string } | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const roles = getRoles(user?.publicMetadata);
  if (!hasRole(roles, "admin")) return null;
  return { userId };
}

function bumpForm(id: string) {
  revalidatePath("/dashboard/form-builder");
  revalidatePath(`/dashboard/form-builder/${id}`);
  revalidatePath(`/dashboard/form-builder/${id}/submissions`);
  revalidateTag(`form:${id}`, "default");
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
});

const idSchema = z.object({ id: z.string().uuid() });
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
    const { id, ...patch } = parsed.data;
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

export async function publishForm(input: z.input<typeof idSchema>) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." };
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid id." };

  // Sanity check: form must have ≥ 1 field.
  const detail = await getFormById(parsed.data.id);
  if (!detail) return { error: "Form not found." };
  if (detail.fields.length === 0)
    return { error: "Add at least one field before publishing." };

  await publishFormRow(parsed.data.id, caller);
  bumpForm(parsed.data.id);
  return { success: true as const };
}

export async function unpublishForm(input: z.input<typeof idSchema>) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." };
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid id." };
  await unpublishFormRow(parsed.data.id, caller);
  bumpForm(parsed.data.id);
  return { success: true as const };
}

export async function deleteForm(input: z.input<typeof idSchema>) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." };
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid id." };
  const ok = await deleteFormRow(parsed.data.id);
  if (!ok) return { error: "Form not found." };
  revalidatePath("/dashboard/form-builder");
  revalidateTag(`form:${parsed.data.id}`, "default");
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
    id: form.id,
    name: form.name,
    status: form.status as FormStatus,
    fieldCount: form.fields.length,
  } as const;
}

export async function fetchFormsList(input: {
  search?: string;
  status?: FormStatus;
  limit: number;
  offset: number;
}) {
  const caller = await requireAdmin();
  if (!caller) return { error: "Forbidden." };
  const out = await listForms(input);

  // Resolve creator names from Clerk
  const creatorIds = [
    ...new Set(out.rows.map((r) => r.createdBy).filter(Boolean) as string[]),
  ];
  const nameMap = new Map<string, string>();
  if (creatorIds.length > 0) {
    const client = await clerkClient();
    await Promise.all(
      creatorIds.map(async (id) => {
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
  const fromDate = input.fromDate ? new Date(input.fromDate) : undefined;
  const toDate = input.toDate ? new Date(input.toDate) : undefined;
  const out = await listSubmissions({ ...input, fromDate, toDate });
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

  const fromDate = input.fromDate ? new Date(input.fromDate) : undefined;
  const toDate = input.toDate ? new Date(input.toDate) : undefined;

  const { rows } = await listSubmissions({
    formId: input.formId,
    status: input.status,
    fromDate,
    toDate,
    search: input.search,
    limit: 5000,
    offset: 0,
  });

  const headers = [
    "created_at",
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
