import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  canViewFormSubmissionsViaPublishedContent,
  getFormSubmissions,
} from "@/data/form-submissions";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";

// Validation schema for query params
const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(10),
  sortField: z.string().default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ formId: string }> },
) {
  try {
    // Await params per Next.js 16 requirements
    const { formId } = await context.params;
    if (!UUID_RE.test(formId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const user = await getOptionalCurrentUser();
    const roles = user ? getRoles(user.publicMetadata) : null;
    const canView =
      (roles && hasRole(roles, "admin")) ||
      (await canViewFormSubmissionsViaPublishedContent(formId, roles));

    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
        { error: "Invalid query parameters", details: error.issues },
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
