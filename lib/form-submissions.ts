"use client";

/**
 * Utilities for working with heterogeneous form submission data.
 * Handles dynamic schema discovery, normalization, and rendering.
 */

export type NormalizedValue =
  | { type: "string"; value: string; isTruncated: boolean }
  | { type: "number"; value: number }
  | { type: "boolean"; value: boolean }
  | { type: "array"; value: string[] }
  | { type: "null"; value: null }
  | { type: "unknown"; value: string };

/**
 * Normalize a single value for safe rendering.
 * Handles coercion, truncation, and type preservation.
 */
export function normalizeValue(
  val: unknown,
  maxStringLength: number = 500,
): NormalizedValue {
  if (val === null || val === undefined) {
    return { type: "null", value: null };
  }

  if (typeof val === "string") {
    if (val.length > maxStringLength) {
      return {
        type: "string",
        value: val.slice(0, maxStringLength),
        isTruncated: true,
      };
    }
    return { type: "string", value: val, isTruncated: false };
  }

  if (typeof val === "number") {
    return { type: "number", value: val };
  }

  if (typeof val === "boolean") {
    return { type: "boolean", value: val };
  }

  if (Array.isArray(val)) {
    // Stringify array items
    const items = val.map((item) => {
      if (typeof item === "string") return item;
      if (typeof item === "number") return String(item);
      if (typeof item === "boolean") return item ? "Yes" : "No";
      return JSON.stringify(item);
    });
    return { type: "array", value: items };
  }

  if (typeof val === "object") {
    // Fallback: stringify objects
    return { type: "unknown", value: JSON.stringify(val) };
  }

  return { type: "unknown", value: String(val) };
}

/**
 * Normalize raw submission data for safe rendering.
 * - Coerce values to predictable types
 * - Handle null/undefined
 * - Preserve arrays
 * - Truncate excessively long strings
 */
export function normalizeSubmissionData(
  rawData: Record<string, unknown>,
  maxStringLength: number = 500,
): Record<string, NormalizedValue> {
  const normalized: Record<string, NormalizedValue> = {};

  for (const [key, val] of Object.entries(rawData)) {
    normalized[key] = normalizeValue(val, maxStringLength);
  }

  return normalized;
}

/**
 * Union all JSON keys across submissions.
 * Returns sorted array of unique keys found in any submission.
 */
export function collectSubmissionKeys(
  submissions: Array<{ data: Record<string, unknown> }>,
): string[] {
  const keys = new Set<string>();
  for (const sub of submissions) {
    if (sub.data && typeof sub.data === "object") {
      Object.keys(sub.data).forEach((k) => keys.add(k));
    }
  }
  return Array.from(keys).sort();
}

/**
 * Resolve a field label by key.
 * Prioritize form field definition; fallback to titleCase(key).
 * Handles both snake_case (field_key) and camelCase (fieldKey) properties.
 */
export function resolveFieldLabel(
  key: string,
  formFields:
    | Array<{ field_key?: string; fieldKey?: string; label: string }>
    | undefined,
): string {
  if (!formFields) {
    return titleCase(key);
  }

  // Try to find matching field in current form definition
  // Check both fieldKey (JS property) and field_key (DB column)
  const field = formFields.find((f) => (f.fieldKey ?? f.field_key) === key);
  if (field?.label) return field.label;

  // Fallback: titleCase the key
  return titleCase(key);
}

/**
 * Convert string to Title Case
 */
export function titleCase(str: string): string {
  return str
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Truncate text and add ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}
