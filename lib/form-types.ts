import type {
  forms,
  formFields,
  formSettings,
  formSubmissions,
} from "@/db/schema";

/**
 * Client-safe types and constants for the Form Builder. Lives outside
 * `data/forms.ts` (which is `server-only`) so client components can import
 * field metadata without dragging the DB client into the browser bundle.
 */

export type FormRow = typeof forms.$inferSelect;
export type FormFieldRow = typeof formFields.$inferSelect;
export type FormSettingsRow = typeof formSettings.$inferSelect;
export type FormSubmissionRow = typeof formSubmissions.$inferSelect;

export type FormStatus = "draft" | "published";
export type SubmissionStatus = "new" | "read" | "spam";
export type EmailStatus = "not_sent" | "sent" | "failed" | "skipped";

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "number"
  | "phone"
  | "select"
  | "radio"
  | "checkbox"
  | "date"
  | "file";

export const FIELD_TYPES: FieldType[] = [
  "text",
  "textarea",
  "email",
  "number",
  "phone",
  "select",
  "radio",
  "checkbox",
  "date",
  "file",
];

export type FieldChoice = { value: string; label: string };
export type FieldOptions = { choices?: FieldChoice[] };
export type FieldValidation = {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  accept?: string[];
  maxFileSizeKb?: number;
};

export type FieldInput = {
  id?: string;
  fieldKey: string;
  fieldType: FieldType;
  label: string;
  placeholder?: string | null;
  helpText?: string | null;
  required: boolean;
  position: number;
  options?: FieldOptions | null;
  validation?: FieldValidation | null;
};

export type FormDetail = {
  form: FormRow;
  fields: FormFieldRow[];
  settings: FormSettingsRow;
};
