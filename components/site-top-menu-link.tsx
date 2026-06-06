"use client";

import Link from "next/link";
import {
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { headerNavTriggerClassName } from "@/components/site-header-nav-styles";
import { cn } from "@/lib/utils";

export function SiteTopMenuLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <NavigationMenuLink
      asChild
      className={cn(navigationMenuTriggerStyle(), headerNavTriggerClassName)}
    >
      <Link href={href}>{label}</Link>
    </NavigationMenuLink>
  );
}
