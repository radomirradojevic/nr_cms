"use client";

interface FormSubmissionsPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Pagination controls for form submissions.
 * Displays Previous/Next buttons, page numbers, and submission info.
 * Responsive design that adapts to mobile and desktop screens.
 */
export function FormSubmissionsPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  isLoading = false,
}: FormSubmissionsPaginationProps) {
  const handlePageClick = async (page: number) => {
    if (page !== currentPage && !isLoading) {
      await onPageChange(page);
    }
  };

  // Generate page numbers with ellipsis for large page counts
  const getPageNumbers = () => {
    const delta = 2;
    const pages: (number | string)[] = [];

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }

    return pages;
  };

  // Don't render pagination if only one page
  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-between gap-4 px-2 py-4">
      {/* Info text - left side */}
      <div className="text-xs text-muted-foreground whitespace-nowrap">
        Page {currentPage} of {totalPages} • {totalItems} total submissions
      </div>

      {/* Pagination controls - right side */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {/* Previous button */}
        <button
          disabled={currentPage === 1 || isLoading}
          onClick={() => handlePageClick(currentPage - 1)}
          className="px-3 py-1.5 rounded border border-border bg-background text-foreground text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {/* Page numbers */}
        <div className="flex gap-1">
          {pageNumbers.map((pageNum, idx) =>
            pageNum === "..." ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 py-1 text-muted-foreground text-xs"
              >
                ...
              </span>
            ) : (
              <button
                key={pageNum}
                disabled={isLoading}
                onClick={() => handlePageClick(Number(pageNum))}
                className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                  pageNum === currentPage
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-foreground hover:bg-muted"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {pageNum}
              </button>
            ),
          )}
        </div>

        {/* Next button */}
        <button
          disabled={currentPage === totalPages || isLoading}
          onClick={() => handlePageClick(currentPage + 1)}
          className="px-3 py-1.5 rounded border border-border bg-background text-foreground text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
