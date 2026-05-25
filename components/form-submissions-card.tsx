"use client";

import {
  collectSubmissionKeys,
  normalizeSubmissionData,
  resolveFieldLabel,
} from "@/lib/form-submissions";
import { FormSubmissionCell } from "./form-submission-cell";
import { FormSubmissionsPagination } from "./form-submissions-pagination";
import type { FormFieldRow, FormSubmissionRow } from "@/lib/form-types";

interface FormSubmissionsCardProps {
  submissions: FormSubmissionRow[];
  fields?: FormFieldRow[];
  total: number;
  currentPage: number;
  pageSize: number;
  pages: number;
  hideId?: boolean;
  hideSubmitted?: boolean;
  onPageChange?: (page: number) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Card/list view for form submissions.
 * Displays each submission as a card with field-value pairs.
 * Works well on mobile devices.
 * Includes pagination controls for navigating between pages.
 */
export function FormSubmissionsCard({
  submissions,
  fields,
  total,
  currentPage,
  pageSize,
  pages,
  hideId = true,
  hideSubmitted = false,
  onPageChange,
  isLoading = false,
}: FormSubmissionsCardProps) {
  // Discover schema from submissions
  const columns = collectSubmissionKeys(
    submissions.map((s) => ({ data: s.data as Record<string, unknown> })),
  );

  if (columns.length === 0 || submissions.length === 0) {
    return (
      <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
        No submissions to display.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cards */}
      <div className="space-y-4">
        {submissions.map((sub) => {
          const normalized = normalizeSubmissionData(
            sub.data as Record<string, unknown>,
          );
          const date = new Date(sub.createdAt);
          const formatted = date.toLocaleString();

          return (
            <div
              key={sub.id}
              className="p-4 border border-border rounded-lg bg-card shadow-sm space-y-3 hover:shadow-md transition-shadow"
            >
              {columns.map((col) => (
                <div
                  key={`${sub.id}-${col}`}
                  className="border-b border-border pb-2 last:border-b-0"
                >
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    {resolveFieldLabel(col, fields)}
                  </div>
                  <FormSubmissionCell
                    value={normalized[col] || { type: "null", value: null }}
                  />
                </div>
              ))}
              {(!hideId || !hideSubmitted) && (
                <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
                  {!hideId && (
                    <span className="font-mono">{sub.id.slice(0, 8)}</span>
                  )}
                  {!hideSubmitted && <span>{formatted}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination controls */}
      {onPageChange && (
        <FormSubmissionsPagination
          currentPage={currentPage}
          totalPages={pages}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={onPageChange}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
