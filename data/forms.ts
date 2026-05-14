import "server-only";
import { db } from "@/db";
import { forms, formFields, formSettings, formSubmissions } from "@/db/schema";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { slugify } from "@/lib/utils";
import type {
  FieldOptions,
  FieldValidation,
  FormDetail,
  FormFieldRow,
  FormRow,
  FormSettingsRow,
  FormStatus,
} from "@/lib/form-types";

// Re-export client-safe types & constants so existing imports from
// "@/data/forms" keep working server-side.
export {
  FIELD_TYPES,
  type FieldChoice,
  type FieldInput,
  type FieldOptions,
  type FieldType,
  type FieldValidation,
  type EmailStatus,
  type FormDetail,
  type FormFieldRow,
  type FormRow,
  type FormSettingsRow,
  type FormStatus,
  type FormSubmissionRow,
  type SubmissionStatus,
} from "@/lib/form-types";

// ─── Slug ─────────────────────────────────────────────────────────────────────

async function generateUniqueSlug(base: string): Promise<string> {
  const baseSlug = slugify(base) || "form";
  let candidate = baseSlug;
  let n = 2;
  for (let i = 0; i < 100; i++) {
    const existing = await db
      .select({ id: forms.id })
      .from(forms)
      .where(eq(forms.slug, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
    candidate = `${baseSlug}-${n++}`;
  }
  return `${baseSlug}-${Date.now()}`;
}

// ─── Forms (read) ─────────────────────────────────────────────────────────────

export async function listForms(opts: {
  search?: string;
  status?: FormStatus;
  limit: number;
  offset: number;
}): Promise<{
  rows: (FormRow & { submissionCount: number; fieldCount: number })[];
  total: number;
}> {
  const conds: SQL[] = [];
  if (opts.status) conds.push(eq(forms.status, opts.status));
  if (opts.search?.trim()) {
    const q = `%${opts.search.trim()}%`;
    const c = or(ilike(forms.name, q), ilike(forms.slug, q));
    if (c) conds.push(c);
  }
  const where = conds.length ? and(...conds) : undefined;

  // Pre-aggregate counts in subqueries then LEFT JOIN to avoid correlated
  // subquery pitfalls with Drizzle's sql`` template parameter binding.
  const submissionCounts = db
    .select({
      formId: formSubmissions.formId,
      cnt: sql<number>`count(*)::int`.as("submission_cnt"),
    })
    .from(formSubmissions)
    .groupBy(formSubmissions.formId)
    .as("sc");

  const fieldCounts = db
    .select({
      formId: formFields.formId,
      cnt: sql<number>`count(*)::int`.as("field_cnt"),
    })
    .from(formFields)
    .groupBy(formFields.formId)
    .as("fc");

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: forms.id,
        name: forms.name,
        slug: forms.slug,
        description: forms.description,
        status: forms.status,
        submitLabel: forms.submitLabel,
        successMessage: forms.successMessage,
        createdBy: forms.createdBy,
        updatedBy: forms.updatedBy,
        createdAt: forms.createdAt,
        updatedAt: forms.updatedAt,
        publishedAt: forms.publishedAt,
        submissionCount: sql<number>`coalesce(${submissionCounts.cnt}, 0)`,
        fieldCount: sql<number>`coalesce(${fieldCounts.cnt}, 0)`,
      })
      .from(forms)
      .leftJoin(submissionCounts, eq(submissionCounts.formId, forms.id))
      .leftJoin(fieldCounts, eq(fieldCounts.formId, forms.id))
      .where(where)
      .orderBy(desc(forms.updatedAt))
      .limit(opts.limit)
      .offset(opts.offset),
    db.select({ total: count() }).from(forms).where(where),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r,
      submissionCount: Number(r.submissionCount ?? 0),
      fieldCount: Number(r.fieldCount ?? 0),
    })),
    total,
  };
}

async function ensureSettings(formId: string): Promise<FormSettingsRow> {
  const existing = await db
    .select()
    .from(formSettings)
    .where(eq(formSettings.formId, formId))
    .limit(1);
  if (existing[0]) return existing[0];
  const inserted = await db.insert(formSettings).values({ formId }).returning();
  return inserted[0];
}

export async function getFormById(id: string): Promise<FormDetail | null> {
  const formRow = await db
    .select()
    .from(forms)
    .where(eq(forms.id, id))
    .limit(1);
  if (!formRow[0]) return null;
  const [fields, settings] = await Promise.all([
    db
      .select()
      .from(formFields)
      .where(eq(formFields.formId, id))
      .orderBy(asc(formFields.position)),
    ensureSettings(id),
  ]);
  return { form: formRow[0], fields, settings };
}

export async function getPublishedFormById(
  id: string,
): Promise<FormDetail | null> {
  const detail = await getFormById(id);
  if (!detail || detail.form.status !== "published") return null;
  return detail;
}

export async function listPublishedFormsForPicker(
  search?: string,
  limit = 50,
): Promise<Pick<FormRow, "id" | "name" | "slug">[]> {
  const conds: SQL[] = [eq(forms.status, "published")];
  if (search?.trim()) {
    const q = `%${search.trim()}%`;
    const c = or(ilike(forms.name, q), ilike(forms.slug, q));
    if (c) conds.push(c);
  }
  return db
    .select({ id: forms.id, name: forms.name, slug: forms.slug })
    .from(forms)
    .where(and(...conds))
    .orderBy(asc(forms.name))
    .limit(limit);
}

// ─── Forms (mutate) ───────────────────────────────────────────────────────────

export async function createForm(
  input: { name: string; description?: string | null },
  caller: { userId: string },
): Promise<{ id: string; slug: string }> {
  const slug = await generateUniqueSlug(input.name);
  const rows = await db
    .insert(forms)
    .values({
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      createdBy: caller.userId,
      updatedBy: caller.userId,
    })
    .returning({ id: forms.id, slug: forms.slug });
  await ensureSettings(rows[0].id);
  return rows[0];
}

export type UpdateFormPatch = {
  name?: string;
  description?: string | null;
  submitLabel?: string;
  successMessage?: string;
};

export async function updateForm(
  id: string,
  patch: UpdateFormPatch,
  caller: { userId: string },
): Promise<FormRow | null> {
  const updates: Partial<typeof forms.$inferInsert> = {
    updatedBy: caller.userId,
  };
  if (patch.name !== undefined) updates.name = patch.name.trim();
  if (patch.description !== undefined)
    updates.description = patch.description?.trim() || null;
  if (patch.submitLabel !== undefined)
    updates.submitLabel = patch.submitLabel.trim() || "Submit";
  if (patch.successMessage !== undefined)
    updates.successMessage =
      patch.successMessage.trim() ||
      "Thank you. Your submission has been received.";

  const rows = await db
    .update(forms)
    .set(updates)
    .where(eq(forms.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function reassignForm(
  id: string,
  newOwnerId: string,
  caller: { userId: string },
): Promise<FormRow | null> {
  const rows = await db
    .update(forms)
    .set({ createdBy: newOwnerId, updatedBy: caller.userId })
    .where(eq(forms.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function publishForm(
  id: string,
  caller: { userId: string },
): Promise<FormRow | null> {
  const rows = await db
    .update(forms)
    .set({
      status: "published",
      publishedAt: new Date(),
      updatedBy: caller.userId,
    })
    .where(eq(forms.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function unpublishForm(
  id: string,
  caller: { userId: string },
): Promise<FormRow | null> {
  const rows = await db
    .update(forms)
    .set({ status: "draft", updatedBy: caller.userId })
    .where(eq(forms.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deleteForm(id: string): Promise<boolean> {
  const rows = await db
    .delete(forms)
    .where(eq(forms.id, id))
    .returning({ id: forms.id });
  return rows.length > 0;
}

// ─── Fields ───────────────────────────────────────────────────────────────────

export async function replaceFormFields(
  formId: string,
  fields: FieldInput[],
  caller: { userId: string },
): Promise<FormFieldRow[]> {
  // Strategy: load existing fields, match by fieldKey to preserve ids.
  const existing = await db
    .select()
    .from(formFields)
    .where(eq(formFields.formId, formId));
  const existingByKey = new Map(existing.map((f) => [f.fieldKey, f]));
  const seenKeys = new Set<string>();
  const incomingKeys = new Set(fields.map((f) => f.fieldKey));
  const toDeleteIds = existing
    .filter((f) => !incomingKeys.has(f.fieldKey))
    .map((f) => f.id);

  if (toDeleteIds.length > 0) {
    await db.delete(formFields).where(inArray(formFields.id, toDeleteIds));
  }

  for (const f of fields) {
    if (seenKeys.has(f.fieldKey)) {
      throw new Error(`Duplicate field key: ${f.fieldKey}`);
    }
    seenKeys.add(f.fieldKey);
    const prev = existingByKey.get(f.fieldKey);
    const values = {
      formId,
      fieldKey: f.fieldKey,
      fieldType: f.fieldType,
      label: f.label,
      placeholder: f.placeholder ?? null,
      helpText: f.helpText ?? null,
      required: f.required,
      position: f.position,
      options: (f.options ?? null) as unknown,
      validation: (f.validation ?? null) as unknown,
    };
    if (prev) {
      await db.update(formFields).set(values).where(eq(formFields.id, prev.id));
    } else {
      await db.insert(formFields).values(values);
    }
  }

  // Bump form's updatedBy/updatedAt
  await db
    .update(forms)
    .set({ updatedBy: caller.userId })
    .where(eq(forms.id, formId));

  return db
    .select()
    .from(formFields)
    .where(eq(formFields.formId, formId))
    .orderBy(asc(formFields.position));
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export type UpdateSettingsPatch = {
  enableEmailNotifications?: boolean;
  notificationRecipients?: string[];
  notificationSubject?: string;
  replyToField?: string | null;
  emailTemplate?: string;
  redirectUrl?: string | null;
  enableTurnstile?: boolean;
};

export async function upsertFormSettings(
  formId: string,
  patch: UpdateSettingsPatch,
  caller: { userId: string },
): Promise<FormSettingsRow> {
  await ensureSettings(formId);
  const updates: Partial<typeof formSettings.$inferInsert> = {};
  if (patch.enableEmailNotifications !== undefined)
    updates.enableEmailNotifications = patch.enableEmailNotifications;
  if (patch.notificationRecipients !== undefined)
    updates.notificationRecipients =
      patch.notificationRecipients as unknown as object;
  if (patch.notificationSubject !== undefined)
    updates.notificationSubject = patch.notificationSubject;
  if (patch.replyToField !== undefined)
    updates.replyToField = patch.replyToField;
  if (patch.emailTemplate !== undefined)
    updates.emailTemplate = patch.emailTemplate;
  if (patch.redirectUrl !== undefined) updates.redirectUrl = patch.redirectUrl;
  if (patch.enableTurnstile !== undefined)
    updates.enableTurnstile = patch.enableTurnstile;

  const rows = await db
    .update(formSettings)
    .set(updates)
    .where(eq(formSettings.formId, formId))
    .returning();
  await db
    .update(forms)
    .set({ updatedBy: caller.userId })
    .where(eq(forms.id, formId));
  return rows[0];
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export type ListSubmissionsParams = {
  formId: string;
  status?: SubmissionStatus;
  fromDate?: Date;
  toDate?: Date;
  search?: string;
  limit: number;
  offset: number;
};

export async function listSubmissions(
  p: ListSubmissionsParams,
): Promise<{ rows: FormSubmissionRow[]; total: number }> {
  const conds: SQL[] = [eq(formSubmissions.formId, p.formId)];
  if (p.status) conds.push(eq(formSubmissions.status, p.status));
  if (p.fromDate) conds.push(gte(formSubmissions.createdAt, p.fromDate));
  if (p.toDate) conds.push(lte(formSubmissions.createdAt, p.toDate));
  if (p.search?.trim()) {
    const q = `%${p.search.trim()}%`;
    conds.push(sql`${formSubmissions.data}::text ILIKE ${q}`);
  }
  const where = and(...conds);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(formSubmissions)
      .where(where)
      .orderBy(desc(formSubmissions.createdAt))
      .limit(p.limit)
      .offset(p.offset),
    db.select({ total: count() }).from(formSubmissions).where(where),
  ]);
  return { rows, total };
}

export async function getSubmissionById(id: string): Promise<{
  submission: FormSubmissionRow;
  form: FormRow;
  fields: FormFieldRow[];
} | null> {
  const sub = await db
    .select()
    .from(formSubmissions)
    .where(eq(formSubmissions.id, id))
    .limit(1);
  if (!sub[0]) return null;
  const f = await db
    .select()
    .from(forms)
    .where(eq(forms.id, sub[0].formId))
    .limit(1);
  if (!f[0]) return null;
  const fields = await db
    .select()
    .from(formFields)
    .where(eq(formFields.formId, sub[0].formId))
    .orderBy(asc(formFields.position));
  return { submission: sub[0], form: f[0], fields };
}

export type InsertSubmissionInput = {
  formId: string;
  data: Record<string, unknown>;
  ipHash: string | null;
  userAgent: string | null;
  referer: string | null;
  submittedBy: string | null;
};

export async function insertSubmission(
  input: InsertSubmissionInput,
): Promise<FormSubmissionRow> {
  const rows = await db
    .insert(formSubmissions)
    .values({
      formId: input.formId,
      data: input.data,
      ipHash: input.ipHash,
      userAgent: input.userAgent,
      referer: input.referer,
      submittedBy: input.submittedBy,
    })
    .returning();
  return rows[0];
}

export async function updateSubmissionStatus(
  id: string,
  status: SubmissionStatus,
): Promise<boolean> {
  const rows = await db
    .update(formSubmissions)
    .set({ status })
    .where(eq(formSubmissions.id, id))
    .returning({ id: formSubmissions.id });
  return rows.length > 0;
}

export async function updateSubmissionEmailStatus(
  id: string,
  patch: { status: EmailStatus; error?: string | null },
): Promise<void> {
  await db
    .update(formSubmissions)
    .set({ emailStatus: patch.status, emailError: patch.error ?? null })
    .where(eq(formSubmissions.id, id));
}

export async function deleteSubmission(id: string): Promise<boolean> {
  const rows = await db
    .delete(formSubmissions)
    .where(eq(formSubmissions.id, id))
    .returning({ id: formSubmissions.id });
  return rows.length > 0;
}

export async function bulkUpdateSubmissionStatus(
  ids: string[],
  status: SubmissionStatus,
): Promise<number> {
  if (ids.length === 0) return 0;
  const rows = await db
    .update(formSubmissions)
    .set({ status })
    .where(inArray(formSubmissions.id, ids))
    .returning({ id: formSubmissions.id });
  return rows.length;
}

export async function bulkDeleteSubmissions(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const rows = await db
    .delete(formSubmissions)
    .where(inArray(formSubmissions.id, ids))
    .returning({ id: formSubmissions.id });
  return rows.length;
}

// ─── Rate-limit helper for submissions ────────────────────────────────────────

const SHORT_MS = 60 * 1000; // 1 min
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const SHORT_MAX = 5;
const HOUR_MAX = 30;
const DAY_MAX = 100;
const DEDUPE_MS = 60 * 1000;

export async function checkSubmissionRateLimit(args: {
  formId: string;
  ipHash: string | null;
  payloadHash: string;
}): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  if (!args.ipHash) return { allowed: true };
  const now = Date.now();

  const [{ c1 } = { c1: 0 }] = await db
    .select({ c1: sql<number>`count(*)::int` })
    .from(formSubmissions)
    .where(
      and(
        eq(formSubmissions.formId, args.formId),
        eq(formSubmissions.ipHash, args.ipHash),
        gte(formSubmissions.createdAt, new Date(now - SHORT_MS)),
      ),
    );
  if (c1 >= SHORT_MAX)
    return { allowed: false, reason: "Too many submissions. Slow down." };

  const [{ ch } = { ch: 0 }] = await db
    .select({ ch: sql<number>`count(*)::int` })
    .from(formSubmissions)
    .where(
      and(
        eq(formSubmissions.formId, args.formId),
        eq(formSubmissions.ipHash, args.ipHash),
        gte(formSubmissions.createdAt, new Date(now - HOUR_MS)),
      ),
    );
  if (ch >= HOUR_MAX)
    return { allowed: false, reason: "Hourly submission limit reached." };

  const [{ cd } = { cd: 0 }] = await db
    .select({ cd: sql<number>`count(*)::int` })
    .from(formSubmissions)
    .where(
      and(
        eq(formSubmissions.formId, args.formId),
        eq(formSubmissions.ipHash, args.ipHash),
        gte(formSubmissions.createdAt, new Date(now - DAY_MS)),
      ),
    );
  if (cd >= DAY_MAX)
    return { allowed: false, reason: "Daily submission limit reached." };

  // Dedupe identical payload within DEDUPE_MS
  const [{ dup } = { dup: 0 }] = await db
    .select({ dup: sql<number>`count(*)::int` })
    .from(formSubmissions)
    .where(
      and(
        eq(formSubmissions.formId, args.formId),
        eq(formSubmissions.ipHash, args.ipHash),
        gte(formSubmissions.createdAt, new Date(now - DEDUPE_MS)),
        sql`md5(${formSubmissions.data}::text) = ${args.payloadHash}`,
      ),
    );
  if (dup > 0)
    return { allowed: false, reason: "Duplicate submission detected." };

  return { allowed: true };
}
