"use client";

import {
  collectSubmissionKeys,
  normalizeSubmissionData,
  resolveFieldLabel,
} from "@/lib/form-submissions";
import { FormSubmissionCell } from "./form-submission-cell";
import { FormSubmissionsLoading } from "./form-submissions-loading";
import { FormSubmissionsPagination } from "./form-submissions-pagination";
import type { FormFieldRow, FormSubmissionRow } from "@/lib/form-types";

interface FormSubmissionsTableProps {
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
 * Table view for form submissions.
 * Dynamically generates columns from discovered keys.
 * Responsive with horizontal scroll on small screens.
 * Includes pagination controls for navigating between pages.
 */
export function FormSubmissionsTable({
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
}: FormSubmissionsTableProps) {
  // Discover schema from submissions
  const columns = collectSubmissionKeys(
    submissions.map((s) => ({ data: s.data as Record<string, unknown> })),
  );

  if (isLoading && submissions.length === 0) {
    return <FormSubmissionsLoading />;
  }

  if (columns.length === 0 || submissions.length === 0) {
    return (
      <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
        No data to display.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/50 border-b border-border">
            <tr>
              {!hideId && (
                <th className="px-4 py-3 text-left font-medium text-foreground w-24">
                  ID
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left font-medium text-foreground whitespace-nowrap"
                >
                  {resolveFieldLabel(col, fields)}
                </th>
              ))}
              {!hideSubmitted && (
                <th className="px-4 py-3 text-left font-medium text-foreground whitespace-nowrap">
                  Submitted
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {submissions.map((sub) => {
              const normalized = normalizeSubmissionData(
                sub.data as Record<string, unknown>,
              );
              const date = new Date(sub.createdAt);
              const formatted = date.toLocaleString();

              return (
                <tr
                  key={sub.id}
                  className="hover:bg-muted/50 transition-colors"
                >
                  {!hideId && (
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono truncate">
                      {sub.id.slice(0, 8)}
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={`${sub.id}-${col}`} className="px-4 py-3">
                      <FormSubmissionCell
                        value={
                          normalized[col] || {
                            type: "null",
                            value: null,
                          }
                        }
                      />
                    </td>
                  ))}
                  {!hideSubmitted && (
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatted}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
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
