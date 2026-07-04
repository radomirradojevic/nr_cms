import "server-only";
import { db } from "@/db";
import {
  content,
  formSubmissions,
  forms,
  formFields,
  webshopProductAttributeValues,
  webshopProducts,
} from "@/db/schema";
import {
  and,
  asc,
  desc,
  eq,
  count,
  isNull,
  lte,
  or,
  type SQL,
} from "drizzle-orm";
import { buildLiveContentWhere } from "@/data/content";
import { canViewContent } from "@/lib/content-visibility";
import type { Role } from "@/lib/roles";
import type {
  FormRow,
  FormFieldRow,
  FormSubmissionRow,
} from "@/lib/form-types";

export type SubmissionWithForm = FormSubmissionRow & {
  form?: FormRow;
};

function objectHasFormSubmissionsEmbed(
  value: unknown,
  formId: string,
): boolean {
  if (!value || typeof value !== "object") return false;

  if (Array.isArray(value)) {
    return value.some((item) => objectHasFormSubmissionsEmbed(item, formId));
  }

  const node = value as Record<string, unknown>;
  const nodeType =
    typeof node.type === "string"
      ? node.type
      : node.type && typeof node.type === "object"
        ? (node.type as Record<string, unknown>).resolvedName
        : null;
  const attrs =
    node.attrs && typeof node.attrs === "object"
      ? (node.attrs as Record<string, unknown>)
      : null;
  const props =
    node.props && typeof node.props === "object"
      ? (node.props as Record<string, unknown>)
      : null;

  if (
    (nodeType === "FormSubmissions" || nodeType === "cmsFormSubmissions") &&
    (props?.formId === formId || attrs?.formId === formId)
  ) {
    return true;
  }

  return Object.values(node).some((item) =>
    objectHasFormSubmissionsEmbed(item, formId),
  );
}

function textHasFormSubmissionsEmbed(value: string | null, formId: string) {
  return (
    value?.includes(`data-cms-form-submissions-id="${formId}"`) ||
    value?.includes(`data-cms-form-submissions-id='${formId}'`)
  );
}

/**
 * Public frontend access to submissions follows the live parent content:
 * if a visible page/blog post embeds this Form Submissions block, the viewer
 * may fetch its rows. Dashboard/admin access is still enforced by callers.
 */
export async function canViewFormSubmissionsViaPublishedContent(
  formId: string,
  viewerRoles: Role[] | null,
): Promise<boolean> {
  const now = new Date();
  const publicProductWhere = and(
    eq(webshopProducts.status, "active"),
    or(
      isNull(webshopProducts.publishedAt),
      lte(webshopProducts.publishedAt, now),
    )!,
  );

  const [rows, productRows, productAttributeRows] = await Promise.all([
    db
      .select({
        content: content.content,
        contentJson: content.contentJson,
        visibility: content.visibility,
      })
      .from(content)
      .where(buildLiveContentWhere()),
    db
      .select({
        description: webshopProducts.description,
        descriptionJson: webshopProducts.descriptionJson,
      })
      .from(webshopProducts)
      .where(publicProductWhere),
    db
      .select({
        valueJson: webshopProductAttributeValues.valueJson,
        valueText: webshopProductAttributeValues.valueText,
      })
      .from(webshopProductAttributeValues)
      .innerJoin(
        webshopProducts,
        eq(webshopProductAttributeValues.productId, webshopProducts.id),
      )
      .where(publicProductWhere),
  ]);

  if (
    rows.some(
      (row) =>
        canViewContent(row.visibility, viewerRoles) &&
        (objectHasFormSubmissionsEmbed(row.contentJson, formId) ||
          textHasFormSubmissionsEmbed(row.content, formId)),
    )
  ) {
    return true;
  }

  if (
    productRows.some(
      (row) =>
        objectHasFormSubmissionsEmbed(row.descriptionJson, formId) ||
        textHasFormSubmissionsEmbed(row.description, formId),
    )
  ) {
    return true;
  }

  return productAttributeRows.some(
    (row) =>
      objectHasFormSubmissionsEmbed(row.valueJson, formId) ||
      textHasFormSubmissionsEmbed(row.valueText, formId),
  );
}

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
