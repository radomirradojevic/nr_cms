import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type BackendTabItem<Value extends string = string> = {
  href: string;
  label: ReactNode;
  value: Value;
};

type BackendTabsProps<Value extends string> = {
  activeValue: Value;
  ariaLabel: string;
  className?: string;
  tabs: readonly BackendTabItem<Value>[];
};

export function BackendTabs<Value extends string>({
  activeValue,
  ariaLabel,
  className,
  tabs,
}: BackendTabsProps<Value>) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "flex h-auto w-full items-center justify-start gap-2 overflow-x-auto border-b text-muted-foreground",
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const selected = activeValue === tab.value;

        return (
          <Link
            aria-current={selected ? "page" : undefined}
            aria-selected={selected}
            className={cn(
              "focus-visible:border-ring focus-visible:ring-ring/50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-[border-color,color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50",
              selected
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            href={tab.href}
            key={tab.value}
            role="tab"
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
