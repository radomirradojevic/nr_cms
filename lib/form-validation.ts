import { z } from "zod";
import { publicMessage, type PublicMessage } from "@/lib/i18n/public-message";
import type { FormFieldRow } from "@/lib/form-types";
import type { FieldOptions, FieldValidation } from "@/lib/form-types";

const TEXT_DEFAULT_MAX = 10_000;
const REQUIRED_FIELD_MESSAGE = "This field is required.";
const REQUIRED_MESSAGE = "Required";
const INVALID_FORMAT_MESSAGE = "Invalid format";
const INVALID_EMAIL_MESSAGE = "Invalid email address.";
const INVALID_PHONE_MESSAGE = "Invalid phone number";
const INVALID_DATE_MESSAGE = "Invalid date";
const INVALID_CHOICE_MESSAGE = "Invalid choice";

export const PUBLIC_FORM_VALIDATION_ERRORS = {
  requiredField: publicMessage(
    "public.forms.errors.requiredField",
    REQUIRED_FIELD_MESSAGE,
  ),
  invalidFormat: publicMessage(
    "public.forms.errors.invalidFormat",
    INVALID_FORMAT_MESSAGE,
  ),
  invalidEmail: publicMessage(
    "public.forms.errors.invalidEmail",
    INVALID_EMAIL_MESSAGE,
  ),
  invalidPhone: publicMessage(
    "public.forms.errors.invalidPhone",
    INVALID_PHONE_MESSAGE,
  ),
  invalidDate: publicMessage(
    "public.forms.errors.invalidDate",
    INVALID_DATE_MESSAGE,
  ),
  invalidChoice: publicMessage(
    "public.forms.errors.invalidChoice",
    INVALID_CHOICE_MESSAGE,
  ),
} as const;

export function getPublicFormValidationError(message: string): PublicMessage {
  switch (message) {
    case REQUIRED_FIELD_MESSAGE:
    case REQUIRED_MESSAGE:
      return PUBLIC_FORM_VALIDATION_ERRORS.requiredField;
    case INVALID_FORMAT_MESSAGE:
      return PUBLIC_FORM_VALIDATION_ERRORS.invalidFormat;
    case INVALID_EMAIL_MESSAGE:
      return PUBLIC_FORM_VALIDATION_ERRORS.invalidEmail;
    case INVALID_PHONE_MESSAGE:
      return PUBLIC_FORM_VALIDATION_ERRORS.invalidPhone;
    case INVALID_DATE_MESSAGE:
      return PUBLIC_FORM_VALIDATION_ERRORS.invalidDate;
    case INVALID_CHOICE_MESSAGE:
      return PUBLIC_FORM_VALIDATION_ERRORS.invalidChoice;
    default:
      return publicMessage("public.forms.errors.invalidFieldValue", message);
  }
}

/**
 * Build a Zod schema for a form's submission `values` object from its
 * persisted field definitions. The returned schema validates the SHAPE
 * of `values` (one entry per field key); per-field rules below.
 *
 * File fields are validated as `{ fileId, originalName, mime, size }` —
 * the existence/ownership check is enforced separately in the route handler.
 */
export function buildFormValuesSchema(fields: FormFieldRow[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    const validation = (f.validation ?? {}) as FieldValidation;
    const options = (f.options ?? {}) as FieldOptions;
    const choices = options.choices ?? [];

    let s: z.ZodTypeAny;
    switch (f.fieldType) {
      case "text":
      case "textarea": {
        let str = z.string().max(validation.maxLength ?? TEXT_DEFAULT_MAX);
        if (validation.minLength !== undefined && validation.minLength > 0)
          str = str.min(validation.minLength);
        else if (f.required) str = str.min(1, REQUIRED_FIELD_MESSAGE);
        if (validation.pattern) {
          try {
            const re = new RegExp(validation.pattern);
            str = str.refine((v) => re.test(v), INVALID_FORMAT_MESSAGE);
          } catch {
            /* ignore bad pattern */
          }
        }
        s = str;
        break;
      }
      case "email": {
        s = z.string().email(INVALID_EMAIL_MESSAGE).max(254);
        break;
      }
      case "phone": {
        // E.164-ish: optional +, then digits/spaces/hyphens.
        s = z
          .string()
          .max(32)
          .refine((v) => /^\+?[0-9 ()\-]{4,}$/.test(v), INVALID_PHONE_MESSAGE);
        break;
      }
      case "number": {
        let n = z.coerce.number();
        if (validation.min !== undefined) n = n.min(validation.min);
        if (validation.max !== undefined) n = n.max(validation.max);
        s = n;
        break;
      }
      case "date": {
        s = z
          .string()
          .refine((v) => !Number.isNaN(Date.parse(v)), INVALID_DATE_MESSAGE);
        break;
      }
      case "select":
      case "radio": {
        const allowed = choices.map((c) => c.value);
        s = z
          .string()
          .refine((v) => allowed.includes(v), INVALID_CHOICE_MESSAGE);
        break;
      }
      case "checkbox": {
        const allowed = choices.map((c) => c.value);
        if (allowed.length === 0) {
          // Single boolean checkbox.
          s = z.coerce.boolean();
        } else {
          s = z
            .array(z.string())
            .max(allowed.length)
            .refine(
              (arr) => arr.every((v) => allowed.includes(v)),
              INVALID_CHOICE_MESSAGE,
            );
        }
        break;
      }
      case "file": {
        s = z.object({
          fileId: z.string().uuid(),
          originalName: z.string().max(255),
          mime: z.string().max(127),
          size: z.number().int().nonnegative(),
        });
        break;
      }
      default:
        s = z.unknown();
    }

    if (!f.required) {
      // Allow missing/empty; collapse "" to undefined for non-strings later.
      s = s.optional().nullable();
    } else if (
      f.fieldType === "checkbox" &&
      (options.choices ?? []).length === 0
    ) {
      // A required single boolean checkbox must be true.
      s = z.literal(true, {
        error: () => ({ message: REQUIRED_MESSAGE }),
      });
    }
    shape[f.fieldKey] = s;
  }
  return z.object(shape).strict();
}

/**
 * Coerce the raw incoming values: trim strings, drop empty optional
 * strings. Returns a copy.
 */
export function normalizeValues(
  raw: Record<string, unknown>,
  fields: FormFieldRow[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = raw[f.fieldKey];
    if (v === undefined || v === null) continue;
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed === "") {
        if (f.required && f.fieldType !== "file") out[f.fieldKey] = "";
        continue;
      }
      out[f.fieldKey] = trimmed;
      continue;
    }
    out[f.fieldKey] = v;
  }
  return out;
}
