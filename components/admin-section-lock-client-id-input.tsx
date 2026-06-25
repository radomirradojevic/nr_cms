"use client";

import type { ComponentProps } from "react";

import { useAdminSectionLockOptional } from "@/components/admin-section-lock-provider";
import { Button } from "@/components/ui/button";

export function AdminSectionLockClientIdInput({
  name = "lockClientId",
}: {
  name?: string;
}) {
  const lock = useAdminSectionLockOptional();
  return <input name={name} type="hidden" value={lock?.clientId ?? ""} />;
}

export function AdminSectionLockSubmitButton({
  disabled,
  ...props
}: ComponentProps<typeof Button>) {
  const lock = useAdminSectionLockOptional();
  const lockBlocksSubmit = lock ? !lock.isEditor || lock.isLoading : false;

  return <Button disabled={disabled || lockBlocksSubmit} {...props} />;
}
