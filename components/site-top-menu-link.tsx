"use client";

import Link from "next/link";
import {
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

export function SiteTopMenuLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
      <Link href={href}>{label}</Link>
    </NavigationMenuLink>
  );
}
