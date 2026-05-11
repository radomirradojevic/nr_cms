"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { GalleryListItem } from "@/data/galleries";
import { fetchGalleries } from "./actions";
import { EditGalleryDialog } from "./edit-gallery-dialog";
import { DeleteGalleryDialog } from "./delete-gallery-dialog";

type Props = {
  initialRows: GalleryListItem[];
  initialTotal: number;
  pageSize: number;
  isAdmin: boolean;
};

export function GalleryList({
  initialRows,
  initialTotal,
  pageSize,
  isAdmin,
}: Props) {
  const [rows, setRows] = useState<GalleryListItem[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(initialRows.length);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editTarget, setEditTarget] = useState<GalleryListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GalleryListItem | null>(
    null,
  );

  void isAdmin;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runFetch(0, true);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function runFetch(nextOffset: number, replace: boolean) {
    startTransition(async () => {
      const res = await fetchGalleries({
        search: search || undefined,
        limit: pageSize,
        offset: nextOffset,
      });
      if ("error" in res) return;
      setTotal(res.total);
      setRows((prev) => (replace ? res.rows : [...prev, ...res.rows]));
      setOffset(nextOffset + res.rows.length);
    });
  }

  function loadMore() {
    runFetch(offset, false);
  }

  const hasMore = rows.length < total;

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search galleries…"
          className="pl-9"
        />
      </div>

      {pending && rows.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-md" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No galleries yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rows.map((g) => (
            <Card key={g.id} className="overflow-hidden p-0 flex flex-col">
              <Link
                href={`/dashboard/gallerymanager/${g.id}`}
                className="aspect-video bg-muted flex items-center justify-center overflow-hidden relative"
              >
                {g.coverFileId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/files/${g.coverFileId}`}
                    alt={g.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                )}
              </Link>

              <CardContent className="p-3 space-y-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/dashboard/gallerymanager/${g.id}`}
                    className="font-medium truncate hover:underline"
                    title={g.name}
                  >
                    {g.name}
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/gallerymanager/${g.id}`}>
                          Open
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setEditTarget(g)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => setDeleteTarget(g)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {g.description && (
                  <p
                    className="text-xs text-muted-foreground line-clamp-2"
                    title={g.description}
                  >
                    {g.description}
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3 shrink-0" />
                  <span className="truncate" title={g.creatorName}>
                    {g.creatorName}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="mt-auto px-3 pb-3 pt-0 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {g.imageCount} image{g.imageCount === 1 ? "" : "s"}
                </span>
                <span>{format(new Date(g.created), "PP")}</span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {rows.length} of {total}
        </p>
        {hasMore && (
          <Button variant="outline" onClick={loadMore} disabled={pending}>
            {pending ? "Loading…" : "Load more"}
          </Button>
        )}
      </div>

      {editTarget && (
        <EditGalleryDialog
          gallery={editTarget}
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
        />
      )}
      {deleteTarget && (
        <DeleteGalleryDialog
          id={deleteTarget.id}
          name={deleteTarget.name}
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          onDeleted={(id) => {
            setRows((prev) => prev.filter((r) => r.id !== id));
            setTotal((t) => Math.max(0, t - 1));
            setOffset((o) => Math.max(0, o - 1));
          }}
        />
      )}
    </div>
  );
}
