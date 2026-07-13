"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { useTranslations } from "@/components/i18n-provider";
import { getRoleLabelKey, ROLES } from "@/lib/roles";

export function UsersFilters() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      // Reset to page 1 whenever a filter changes (except when changing page)
      if (!("page" in updates)) {
        params.delete("page");
      }
      return params.toString();
    },
    [searchParams],
  );

  const updateFilter = useCallback(
    (updates: Record<string, string | null>) => {
      const qs = createQueryString(updates);
      startTransition(() => {
        router.push(`${pathname}${qs ? `?${qs}` : ""}`);
      });
    },
    [router, pathname, createQueryString],
  );

  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "all";
  const role = searchParams.get("role") ?? "all";
  const presence = searchParams.get("presence") ?? "all";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-8"
          placeholder={t("dashboard.users.searchPlaceholder")}
          defaultValue={search}
          onChange={(e) => {
            const value = e.target.value;
            updateFilter({ search: value || null });
          }}
        />
      </div>

      <Select
        value={status}
        onValueChange={(val) => updateFilter({ status: val })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder={t("dashboard.filters.status")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {t("dashboard.filters.allStatuses")}
          </SelectItem>
          <SelectItem value="active">
            {t("dashboard.users.status.active")}
          </SelectItem>
          <SelectItem value="locked">
            {t("dashboard.users.status.locked")}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select value={role} onValueChange={(val) => updateFilter({ role: val })}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder={t("dashboard.filters.role")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("dashboard.filters.allRoles")}</SelectItem>
          {ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {t(getRoleLabelKey(r))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={presence}
        onValueChange={(val) => updateFilter({ presence: val })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder={t("dashboard.filters.presence")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("dashboard.filters.allUsers")}</SelectItem>
          <SelectItem value="online">
            {t("dashboard.users.presence.online")}
          </SelectItem>
          <SelectItem value="offline">
            {t("dashboard.users.presence.offline")}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
