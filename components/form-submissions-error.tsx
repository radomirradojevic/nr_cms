"use client";

import { AlertCircle } from "lucide-react";

/**
 * Error state for Form Submissions block.
 */
export function FormSubmissionsError({ message }: { message: string }) {
  return (
    <div className="my-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex gap-3">
      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-destructive">
          Error loading submissions
        </p>
        <p className="text-xs text-destructive/80 mt-1">{message}</p>
      </div>
    </div>
  );
}
