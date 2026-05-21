"use client";

import { Badge } from "@/components/ui/badge";
import type { NormalizedValue } from "@/lib/form-submissions";

/**
 * Safely render a single normalized submission value.
 * Never renders HTML from user input.
 */
export function FormSubmissionCell({ value }: { value: NormalizedValue }) {
  if (value.type === "null") {
    return <span className="text-muted-foreground">—</span>;
  }

  if (value.type === "string") {
    if (value.isTruncated) {
      return (
        <span className="block truncate text-foreground" title={value.value}>
          {value.value}…
        </span>
      );
    }
    return (
      <span className="block break-words whitespace-pre-wrap text-sm text-foreground">
        {value.value}
      </span>
    );
  }

  if (value.type === "array") {
    return (
      <div className="flex flex-wrap gap-1">
        {value.value.map((item, i) => (
          <Badge key={i} variant="secondary" className="text-xs">
            {item}
          </Badge>
        ))}
      </div>
    );
  }

  if (value.type === "boolean") {
    return (
      <Badge variant={value.value ? "default" : "outline"}>
        {value.value ? "Yes" : "No"}
      </Badge>
    );
  }

  if (value.type === "number") {
    return <span className="text-sm text-foreground">{value.value}</span>;
  }

  // Fallback for unknown types
  return <span className="text-muted-foreground text-sm">[Unknown]</span>;
}
