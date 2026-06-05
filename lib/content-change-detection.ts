type Comparable =
  | null
  | boolean
  | number
  | string
  | Comparable[]
  | { [key: string]: Comparable };

const IGNORED_SAVE_METADATA_KEYS = new Set(["updatedBy"]);

export function hasMeaningfulContentChanges(
  current: object,
  values: object,
): boolean {
  const currentRecord = current as Record<string, unknown>;

  return Object.entries(values).some(([key, nextValue]) => {
    if (IGNORED_SAVE_METADATA_KEYS.has(key)) return false;

    return !areComparableValuesEqual(currentRecord[key], nextValue);
  });
}

function areComparableValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(toComparable(left)) === JSON.stringify(toComparable(right));
}

function toComparable(value: unknown): Comparable {
  if (value === undefined) return { __type: "undefined" };
  if (value === null) return null;

  if (value instanceof Date) {
    return {
      __type: "date",
      value: Number.isNaN(value.getTime()) ? "invalid" : value.getTime(),
    };
  }

  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return Number.isNaN(value) ? { __type: "number", value: "NaN" } : value;
  }

  if (Array.isArray(value)) {
    return value.map(toComparable);
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

    return Object.fromEntries(
      entries.map(([key, entryValue]) => [key, toComparable(entryValue)]),
    ) as { [key: string]: Comparable };
  }

  return String(value);
}
