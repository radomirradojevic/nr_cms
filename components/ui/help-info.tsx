"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info, X } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type HelpInfoProps = {
  align?: "center" | "end" | "start";
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  side?: "bottom" | "left" | "right" | "top";
  title?: ReactNode;
};

export function HelpInfo({
  align = "start",
  children,
  className,
  contentClassName,
  side = "top",
  title,
}: HelpInfoProps) {
  const contentId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = pinned || hoverOpen;

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openForHover() {
    clearCloseTimer();
    if (!pinned) setHoverOpen(true);
  }

  function scheduleHoverClose() {
    if (pinned) return;
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setHoverOpen(false), 120);
  }

  function closePinned() {
    clearCloseTimer();
    setPinned(false);
    setHoverOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closePinned();
      }}
    >
      <PopoverTrigger asChild>
        <button
          aria-controls={open ? contentId : undefined}
          aria-expanded={open}
          aria-label={typeof title === "string" ? `Help: ${title}` : "Help"}
          className={cn(
            "inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition hover:border-primary/70 hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
            pinned && "border-primary/70 text-foreground",
            className,
          )}
          onBlur={scheduleHoverClose}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            clearCloseTimer();
            setHoverOpen(false);
            setPinned((current) => !current);
          }}
          onFocus={openForHover}
          onMouseEnter={openForHover}
          onMouseLeave={scheduleHoverClose}
          type="button"
        >
          <Info aria-hidden className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className={cn(
          "w-80 max-w-[calc(100vw-2rem)] border border-border/80 p-3 shadow-lg shadow-background/30",
          contentClassName,
        )}
        id={contentId}
        onMouseEnter={openForHover}
        onMouseLeave={scheduleHoverClose}
        onOpenAutoFocus={(event) => event.preventDefault()}
        side={side}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            {title ? (
              <div className="text-sm font-medium text-popover-foreground">
                {title}
              </div>
            ) : null}
            <div className="text-xs leading-relaxed text-muted-foreground">
              {children}
            </div>
          </div>
          {pinned ? (
            <button
              aria-label="Close help"
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              onClick={closePinned}
              type="button"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
