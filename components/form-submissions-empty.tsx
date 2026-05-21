"use client";

/**
 * Empty state for Form Submissions block when no submissions exist.
 */
export function FormSubmissionsEmpty() {
  return (
    <div className="my-4 rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
      <div className="text-sm font-medium text-foreground mb-1">
        No submissions yet
      </div>
      <p className="text-xs text-muted-foreground">
        Submissions will appear here once users submit the form.
      </p>
    </div>
  );
}
