"use client";

import dynamic from "next/dynamic";

const UserButtonWithRoles = dynamic(
  () =>
    import("@/components/user-button-with-roles").then(
      (m) => m.UserButtonWithRoles,
    ),
  { ssr: false },
);

export function UserButtonClient() {
  return <UserButtonWithRoles />;
}
