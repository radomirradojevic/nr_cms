"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { getRoles, type Role } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/components/i18n-provider";
import { ShieldCheckIcon } from "lucide-react";
import type { TranslationKey } from "@/lib/i18n/keys";

const roleBadgeVariant: Record<
  Role,
  "default" | "secondary" | "outline" | "destructive"
> = {
  viewer: "outline",
  author: "secondary",
  publisher: "default",
  admin: "destructive",
};

const roleLabelKeys: Record<Role, TranslationKey> = {
  viewer: "common.roles.viewer",
  author: "common.roles.author",
  publisher: "common.roles.publisher",
  admin: "common.roles.admin",
};

const roleDescriptionKeys: Record<Role, TranslationKey> = {
  viewer: "common.roles.viewerDescription",
  author: "common.roles.authorDescription",
  publisher: "common.roles.publisherDescription",
  admin: "common.roles.adminDescription",
};

function RolesProfilePage() {
  const t = useTranslations();
  const { user } = useUser();
  const roles = getRoles(user?.publicMetadata);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{t("common.roles.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("common.roles.description")}
        </p>
      </div>
      <div className="space-y-2">
        {roles.map((role) => (
          <div
            key={role}
            className="flex items-start gap-3 rounded-lg border p-3"
          >
            <Badge variant={roleBadgeVariant[role]} className="mt-0.5">
              {t(roleLabelKeys[role])}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {t(roleDescriptionKeys[role])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UserButtonWithRoles() {
  const t = useTranslations();

  return (
    <UserButton>
      <UserButton.UserProfilePage
        label={t("common.roles.title")}
        url="roles"
        labelIcon={<ShieldCheckIcon className="size-4" />}
      >
        <RolesProfilePage />
      </UserButton.UserProfilePage>
    </UserButton>
  );
}
