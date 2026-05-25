export type LayoutKind =
  | "1-col"
  | "2-col"
  | "3-col"
  | "4-col"
  | "70-30"
  | "30-70"
  | "60-40"
  | "40-60";

export type LayoutGap = "sm" | "md" | "lg";

export type LayoutPreset = {
  value: LayoutKind;
  label: string;
  tracks: string;
  columns: number;
};

export const layoutPresets: LayoutPreset[] = [
  { value: "1-col", label: "1 Column", tracks: "1fr", columns: 1 },
  { value: "2-col", label: "2 Columns (50/50)", tracks: "1fr 1fr", columns: 2 },
  { value: "70-30", label: "70/30", tracks: "7fr 3fr", columns: 2 },
  { value: "30-70", label: "30/70", tracks: "3fr 7fr", columns: 2 },
  { value: "60-40", label: "60/40", tracks: "6fr 4fr", columns: 2 },
  { value: "40-60", label: "40/60", tracks: "4fr 6fr", columns: 2 },
  { value: "3-col", label: "3 Columns", tracks: "1fr 1fr 1fr", columns: 3 },
  { value: "4-col", label: "4 Columns", tracks: "1fr 1fr 1fr 1fr", columns: 4 },
];

export const layoutGapOptions: Array<{
  value: LayoutGap;
  label: string;
  className: string;
}> = [
  { value: "sm", label: "Small", className: "gap-3" },
  { value: "md", label: "Medium", className: "gap-6" },
  { value: "lg", label: "Large", className: "gap-10" },
];

export function normalizeLayoutKind(value: unknown): LayoutKind {
  return layoutPresets.some((preset) => preset.value === value)
    ? (value as LayoutKind)
    : "2-col";
}

export function getLayoutPreset(value: unknown): LayoutPreset {
  const normalized = normalizeLayoutKind(value);
  return (
    layoutPresets.find((preset) => preset.value === normalized) ??
    layoutPresets[1]
  );
}

export function getLayoutColumnCount(value: unknown): number {
  return getLayoutPreset(value).columns;
}
