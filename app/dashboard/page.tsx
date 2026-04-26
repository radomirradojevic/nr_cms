import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getLinksByUserIdPaginated } from '@/data/links';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreateLinkDialog } from '@/app/dashboard/create-link-dialog';
import { EditLinkDialog } from '@/app/dashboard/edit-link-dialog';
import { DeleteLinkDialog } from '@/app/dashboard/delete-link-dialog';
import { PageSizeSelector } from '@/app/dashboard/page-size-selector';

const ALLOWED_PAGE_SIZES = [10, 20, 30] as const;
type AllowedPageSize = (typeof ALLOWED_PAGE_SIZES)[number];

function parsePageSize(value: string | undefined): AllowedPageSize {
  const n = parseInt(value ?? '10', 10);
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
    redirect('/');
  }

  const {
    page: pageParam,
    search,
    pageSize: pageSizeParam,
  } = await searchParams;
  const query = search?.trim() ?? '';
  const pageSize = parsePageSize(pageSizeParam);
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);

  const { links, total } = await getLinksByUserIdPaginated(
    userId,
    page,
    pageSize,
    query || undefined,
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (pageSize !== 10) params.set('pageSize', String(pageSize));
    params.set('page', String(p));
    return `?${params.toString()}`;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Links</h1>
        <CreateLinkDialog />
      </div>
      <form method="get" className="mb-4">
        <Input
          name="search"
          defaultValue={query}
          placeholder="Search by short code or URL…"
          className="max-w-sm"
        />
      </form>
      {total === 0 ? (
        <p className="text-muted-foreground">
          {query ? 'No links match your search.' : 'You have no links yet.'}
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Short Code</TableHead>
                <TableHead>Original URL</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-mono">
                    <Link
                      href={`/l/${link.shortCode}`}
                      className="hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.shortCode}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {link.originalUrl}
                  </TableCell>
                  <TableCell>{link.createdAt.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <EditLinkDialog link={link} />
                      <DeleteLinkDialog link={link} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {safePage} of {totalPages} &mdash; {total} total links
            </p>
            <div className="flex items-center gap-4">
              <PageSizeSelector pageSize={pageSize} />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={safePage <= 1}
                >
                  <Link href={buildHref(safePage - 1)}>Previous</Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={safePage >= totalPages}
                >
                  <Link href={buildHref(safePage + 1)}>Next</Link>
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
