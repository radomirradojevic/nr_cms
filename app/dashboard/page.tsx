import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getLinksByUserIdPaginated } from "@/data/links";
import { Input } from "@/components/ui/input";
import { LinksTable } from "@/app/dashboard/links-table";

const ALLOWED_PAGE_SIZES = [10, 20, 30] as const;
type AllowedPageSize = (typeof ALLOWED_PAGE_SIZES)[number];

function parsePageSize(value: string | undefined): AllowedPageSize {
  const n = parseInt(value ?? "10", 10);
  return (ALLOWED_PAGE_SIZES as readonly number[]).includes(n)
    ? (n as AllowedPageSize)
    : 10;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; pageSize?: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const {
    page: pageParam,
    search,
    pageSize: pageSizeParam,
  } = await searchParams;
  const query = search?.trim() ?? "";
  const pageSize = parsePageSize(pageSizeParam);
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const { links, total } = await getLinksByUserIdPaginated(
    userId,
    page,
    pageSize,
    query || undefined,
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  return (
    <div className="container mx-auto py-8">
      <form method="get" className="mb-4">
        <Input
          name="search"
          defaultValue={query}
          placeholder="Search by short code or URL…"
          className="max-w-sm"
        />
      </form>
      <LinksTable
        links={links}
        total={total}
        safePage={safePage}
        totalPages={totalPages}
        query={query}
        pageSize={pageSize}
      />
    </div>
  );
}
