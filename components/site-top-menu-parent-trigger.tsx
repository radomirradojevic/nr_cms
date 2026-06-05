"use client";

import { useRouter } from "next/navigation";
import { NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { headerNavTriggerClassName } from "@/components/site-header-nav-styles";
import { cn } from "@/lib/utils";

function isExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

export function SiteTopMenuParentTrigger({
  url,
  target,
  label,
}: {
  url: string;
  target: "_self" | "_blank";
  label: string;
}) {
  const router = useRouter();

  return (
    <NavigationMenuTrigger
      className={cn("cursor-pointer", headerNavTriggerClassName)}
      onClick={(e) => {
        // Don't interfere with modifier-clicks or middle-clicks.
        if (e.defaultPrevented) return;
        if (e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        if (target === "_blank" || isExternal(url)) {
          window.open(
            url,
            target,
            target === "_blank" ? "noopener,noreferrer" : undefined,
          );
        } else {
          router.push(url);
        }
      }}
    >
      {label}
    </NavigationMenuTrigger>
  );
}
