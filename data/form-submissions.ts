import "server-only";
import { db } from "@/db";
import { formSubmissions, forms, formFields } from "@/db/schema";
import { asc, desc, eq, count, type SQL } from "drizzle-orm";
import type {
  FormRow,
  FormFieldRow,
  FormSubmissionRow,
} from "@/lib/form-types";

export type SubmissionWithForm = FormSubmissionRow & {
  form?: FormRow;
};

/**
 * Fetch a single form (with fields).
 */
export async function getFormForSubmissions(
  formId: string,
): Promise<{ form: FormRow; fields: FormFieldRow[] } | null> {
  const formRow = await db
    .select()
    .from(forms)
    .where(eq(forms.id, formId))
    .limit(1);

  if (!formRow[0]) return null;

  const fields = await db
    .select()
    .from(formFields)
    .where(eq(formFields.formId, formId))
    .orderBy(asc(formFields.position));

  return {
    form: formRow[0],
    fields,
  };
}

export interface FormSubmissionsPaginationOptions {
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Fetch paginated submissions for a form.
 * - Supports sorting by any column or created_at
 * - Returns raw submissions (normalization happens in component)
 */
export async function getFormSubmissions(
  formId: string,
  {
    page = 1,
    pageSize = 10,
    sortField = "created_at",
    sortOrder = "desc",
  }: FormSubmissionsPaginationOptions = {},
) {
  // Validate inputs
  const validPageSize = Math.min(Math.max(pageSize, 1), 100);
  const validPage = Math.max(page, 1);
  const offset = (validPage - 1) * validPageSize;

  // Determine sort order
  let orderByClause: SQL;
  if (sortField === "created_at" || !sortField) {
    orderByClause =
      sortOrder === "asc"
        ? asc(formSubmissions.createdAt)
        : desc(formSubmissions.createdAt);
  } else {
    // Fallback to created_at for unknown fields
    orderByClause =
      sortOrder === "asc"
        ? asc(formSubmissions.createdAt)
        : desc(formSubmissions.createdAt);
  }

  const [submissionRows, totalResult] = await Promise.all([
    db
      .select()
      .from(formSubmissions)
      .where(eq(formSubmissions.formId, formId))
      .orderBy(orderByClause)
      .limit(validPageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(formSubmissions)
      .where(eq(formSubmissions.formId, formId)),
  ]);

  const total = totalResult[0]?.count ?? 0;

  return {
    submissions: submissionRows,
    total,
    page: validPage,
    pageSize: validPageSize,
    pages: Math.ceil(total / validPageSize),
  };
}

/**
 * Get submission count for a form
 */
export async function getFormSubmissionCount(formId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(formSubmissions)
    .where(eq(formSubmissions.formId, formId));

  return result[0]?.count ?? 0;
}
