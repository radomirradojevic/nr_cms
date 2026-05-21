import { z } from "zod";
import type { FormSubmissionsProps } from "../types";

/**
 * Validation schema for FormSubmissionsProps
 */
export const FormSubmissionsPropsSchema = z.object({
  formId: z.string().uuid("Invalid form ID").optional().default(""),
  displayMode: z.enum(["table", "card"]).optional().default("table"),
  pageSize: z
    .number()
    .min(5, "Page size must be at least 5")
    .max(100, "Page size must be at most 100")
    .optional()
    .default(10),
  sortField: z.string().optional().default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  hideId: z.boolean().optional().default(true),
  style: z.any().optional(),
}) satisfies z.ZodType<FormSubmissionsProps>;

export type FormSubmissionsBlockSchema = z.infer<
  typeof FormSubmissionsPropsSchema
>;
