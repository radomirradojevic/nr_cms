"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";

import { searchBackendUsers } from "@/app/dashboard/backend-user-picker-actions";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { BackendUserOption } from "@/lib/backend-user-types";

type Props = {
  value: string;
  onValueChange: (user: BackendUserOption) => void;
  selectedUser?: BackendUserOption | null;
  currentUserId?: string | null;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
} & Pick<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "id" | "aria-describedby" | "aria-invalid"
>;

const PAGE_SIZE = 20;

export const BackendUserCombobox = forwardRef<HTMLButtonElement, Props>(
  function BackendUserCombobox(
    {
      value,
      onValueChange,
      selectedUser,
      currentUserId,
      placeholder = "Select a user...",
      searchPlaceholder = "Search users...",
      disabled,
      className,
      id,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
    },
    ref,
  ) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [users, setUsers] = useState<BackendUserOption[]>([]);
    const [nextOffset, setNextOffset] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const requestRef = useRef(0);

    const selected =
      users.find((user) => user.id === value) ??
      (selectedUser?.id === value ? selectedUser : null);

    const loadUsers = useCallback(
      async ({
        nextQuery,
        offset,
        append,
      }: {
        nextQuery: string;
        offset: number;
        append: boolean;
      }) => {
        const requestId = requestRef.current + 1;
        requestRef.current = requestId;
        setError(null);
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
          setUsers([]);
          setHasMore(false);
          setNextOffset(0);
        }

        const result = await searchBackendUsers({
          query: nextQuery || undefined,
          limit: PAGE_SIZE,
          offset,
        });

        if (requestRef.current !== requestId) return;

        if ("error" in result) {
          setError(result.error);
          if (!append) setUsers([]);
        } else {
          setUsers((prev) =>
            append ? mergeUsers(prev, result.users) : result.users,
          );
          setNextOffset(result.nextOffset);
          setHasMore(result.hasMore);
        }

        setLoading(false);
        setLoadingMore(false);
      },
      [],
    );

    useEffect(() => {
      if (!open) return;

      const timeout = window.setTimeout(
        () => {
          void loadUsers({ nextQuery: query.trim(), offset: 0, append: false });
        },
        query.trim() ? 300 : 0,
      );

      return () => window.clearTimeout(timeout);
    }, [open, query, loadUsers]);

    useEffect(() => {
      if (!open) return;
      const timeout = window.setTimeout(() => searchRef.current?.focus(), 0);
      return () => window.clearTimeout(timeout);
    }, [open]);

    function handleOpenChange(nextOpen: boolean) {
      setOpen(nextOpen);
      if (!nextOpen) {
        requestRef.current += 1;
        setQuery("");
        setError(null);
        setLoading(false);
        setLoadingMore(false);
      }
    }

    function handleSelect(user: BackendUserOption) {
      onValueChange(user);
      handleOpenChange(false);
    }

    function handleLoadMore() {
      if (loadingMore || loading || !hasMore) return;
      void loadUsers({
        nextQuery: query.trim(),
        offset: nextOffset,
        append: true,
      });
    }

    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
            disabled={disabled}
            className={cn("w-full justify-between font-normal", className)}
          >
            <span
              className={cn(
                "min-w-0 truncate",
                !selected && "text-muted-foreground",
              )}
            >
              {selected ? selected.name : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] gap-0 overflow-hidden p-0"
          align="start"
        >
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin opacity-60" />}
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {error ? (
              <p className="px-3 py-4 text-center text-sm text-destructive">
                {error}
              </p>
            ) : loading && users.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                No backend users found.
              </p>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    value === user.id && "bg-muted font-medium",
                  )}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value === user.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {user.name}
                    {currentUserId === user.id ? " (current)" : ""}
                  </span>
                </button>
              ))
            )}

            {hasMore && !error && users.length > 0 && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex w-full items-center justify-center gap-2 border-t px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  },
);

function mergeUsers(
  existing: BackendUserOption[],
  incoming: BackendUserOption[],
) {
  const seen = new Set(existing.map((user) => user.id));
  return [
    ...existing,
    ...incoming.filter((user) => {
      if (seen.has(user.id)) return false;
      seen.add(user.id);
      return true;
    }),
  ];
}
