"use client";

/**
 * Loading state for Form Submissions block while submissions are being fetched.
 */
export function FormSubmissionsLoading() {
  return (
    <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
      Loading...
    </div>
  );
}
