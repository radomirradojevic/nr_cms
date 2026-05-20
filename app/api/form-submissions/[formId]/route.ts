import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFormSubmissions } from "@/data/form-submissions";

// Validation schema for query params
const QuerySchema = z.object({
  page: z.string().default("1").pipe(z.coerce.number().min(1)),
  pageSize: z.string().default("10").pipe(z.coerce.number().min(5).max(100)),
  sortField: z.string().default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ formId: string }> },
) {
  try {
    // Await params per Next.js 16 requirements
    const { formId } = await context.params;

    // Parse query
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validated = QuerySchema.parse(searchParams);

    // Fetch submissions
    const { submissions, total, pages, page } = await getFormSubmissions(
      formId,
      {
        page: validated.page,
        pageSize: validated.pageSize,
        sortField: validated.sortField,
        sortOrder: validated.sortOrder,
      },
    );

    return NextResponse.json({
      submissions,
      total,
      page,
      pages,
      pageSize: validated.pageSize,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 },
      );
    }

    console.error("[Form Submissions API]", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 },
    );
  }
}
