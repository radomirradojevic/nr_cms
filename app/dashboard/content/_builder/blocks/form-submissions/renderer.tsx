"use client";

import { useEffect, useState } from "react";
import { FormSubmissionsTable } from "@/components/form-submissions-table";
import { FormSubmissionsCard } from "@/components/form-submissions-card";
import { FormSubmissionsError } from "@/components/form-submissions-error";
import type { FormFieldRow, FormSubmissionRow } from "@/lib/form-types";

interface FormSubmissionsRendererProps {
  formId: string;
  displayMode: "table" | "card";
  pageSize: number;
  sortField: string;
  sortOrder: "asc" | "desc";
  hideId?: boolean;
  hideSubmitted?: boolean;
  fields?: FormFieldRow[];
}

interface SubmissionsResponse {
  submissions: FormSubmissionRow[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
}

/**
 * Client-side renderer that manages pagination state for form submissions.
 * Fetches data on demand as user navigates between pages.
 */
export function FormSubmissionsRenderer({
  formId,
  displayMode,
  pageSize,
  sortField,
  sortOrder,
  hideId = true,
  hideSubmitted = false,
  fields,
}: FormSubmissionsRendererProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [submissions, setSubmissions] = useState<FormSubmissionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch submissions for a specific page
  const fetchSubmissions = async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortField,
        sortOrder,
      });

      const response = await fetch(`/api/form-submissions/${formId}?${params}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data: SubmissionsResponse = await response.json();
      setSubmissions(data.submissions);
      setTotal(data.total);
      setPages(data.pages);
      setCurrentPage(data.page);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to load submissions: ${message}`);
      console.error("[FormSubmissionsRenderer]", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch initial submissions on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSubmissions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, pageSize, sortField, sortOrder]);

  // Handle page change
  const handlePageChange = async (page: number) => {
    await fetchSubmissions(page);
  };

  if (error) {
    return <FormSubmissionsError message={error} />;
  }

  return (
    <div className="space-y-4">
      {displayMode === "card" ? (
        <FormSubmissionsCard
          submissions={submissions}
          fields={fields}
          total={total}
          currentPage={currentPage}
          pageSize={pageSize}
          pages={pages}
          hideId={hideId}
          hideSubmitted={hideSubmitted}
          onPageChange={handlePageChange}
          isLoading={isLoading}
        />
      ) : (
        <FormSubmissionsTable
          submissions={submissions}
          fields={fields}
          total={total}
          currentPage={currentPage}
          pageSize={pageSize}
          pages={pages}
          hideId={hideId}
          hideSubmitted={hideSubmitted}
          onPageChange={handlePageChange}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
