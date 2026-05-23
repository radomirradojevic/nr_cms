"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { UserButtonClient } from "@/components/user-button-client";
import { cn } from "@/lib/utils";
import type { TopMenuTreeNode } from "@/data/top-menu";

function isExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

function NavLink({
  url,
  target,
  children,
  className,
  onClick,
}: {
  url: string;
  target: "_self" | "_blank";
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  if (isExternal(url)) {
    return (
      <a
        href={url}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        className={className}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={url} target={target} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

function MobileMenuItem({
  item,
  onClose,
  depth = 0,
}: {
  item: TopMenuTreeNode;
  onClose: () => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.children.length > 0;

  return (
    <li>
      <div className="flex items-center gap-1">
        <NavLink
          url={item.url}
          target={item.target}
          className={cn(
            "flex flex-1 items-center rounded-md px-3 py-2.5 text-sm font-medium",
            "min-h-[44px] transition-colors duration-150",
            "hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-foreground)]",
            "focus-visible:bg-[var(--nav-hover-bg)] focus-visible:text-[var(--nav-hover-foreground)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          onClick={onClose}
        >
          {item.label}
        </NavLink>

        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={expanded}
            aria-label={
              expanded
                ? `Collapse ${item.label} submenu`
                : `Expand ${item.label} submenu`
            }
            className="h-10 w-10 shrink-0 rounded-md p-0"
            onClick={() => setExpanded((v) => !v)}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                expanded && "rotate-180",
              )}
            />
          </Button>
        )}
      </div>

      {hasChildren && (
        <ul
          className={cn(
            "overflow-hidden transition-[max-height,opacity] duration-250 ease-in-out",
            expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0",
          )}
          aria-hidden={!expanded}
        >
          <div
            className={cn(
              "space-y-0.5 py-1",
              depth === 0 ? "ml-4 border-l border-border pl-3" : "ml-2 pl-2",
            )}
          >
            {item.children.map((child) => (
              <MobileMenuItem
                key={child.id}
                item={child}
                onClose={onClose}
                depth={depth + 1}
              />
            ))}
          </div>
        </ul>
      )}
    </li>
  );
}

const BACKEND_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  {
    href: "/dashboard/global-settings",
    label: "Global Settings",
    isChild: true,
    adminOnly: true,
  },
  { href: "/dashboard/content", label: "Content" },
  {
    href: "/dashboard/content-categories",
    label: "Content Categories",
    isChild: true,
    adminOnly: true,
  },
  { href: "/dashboard/filemanager", label: "File Manager" },
  {
    href: "/dashboard/gallerymanager",
    label: "Gallery Manager",
    isChild: true,
  },
];

const ADMIN_LINKS = [
  { href: "/dashboard/users", label: "Users" },
  { href: "/dashboard/top-menu", label: "Top Menu" },
  { href: "/dashboard/form-builder", label: "Form Builder" },
];

function AdminNavLink({
  href,
  label,
  onClose,
  isChild,
}: {
  href: string;
  label: string;
  onClose: () => void;
  isChild?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClose}
        className={cn(
          "flex items-center rounded-md px-3 py-2.5 text-sm font-medium",
          "min-h-[44px] transition-colors duration-150",
          "hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-foreground)]",
          "focus-visible:bg-[var(--nav-hover-bg)] focus-visible:text-[var(--nav-hover-foreground)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isChild && "ml-4 text-muted-foreground",
        )}
      >
        {isChild && <span className="mr-2 text-muted-foreground">↳</span>}
        {label}
      </Link>
    </li>
  );
}

export function SiteTopMenuMobile({
  tree,
  isBackendUser = false,
  isAdmin = false,
  isLoggedIn = false,
}: {
  tree: TopMenuTreeNode[];
  isBackendUser?: boolean;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const hasSiteNav = tree.length > 0;
  const hasAnything = hasSiteNav || isBackendUser || true;

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  /* Prevent body scroll while open */
  useEffect(() => {
    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousHtmlOverscrollBehavior =
      documentElement.style.overscrollBehavior;

    if (isOpen) {
      body.style.overflow = "hidden";
      body.style.overscrollBehavior = "none";
      documentElement.style.overflow = "hidden";
      documentElement.style.overscrollBehavior = "none";
    }

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      documentElement.style.overflow = previousHtmlOverflow;
      documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior;
    };
  }, [isOpen]);

  if (!hasAnything) return null;

  const backendLinks = isBackendUser
    ? BACKEND_LINKS.filter((l) => !l.adminOnly || isAdmin)
    : [];
  const adminLinks = isAdmin ? ADMIN_LINKS : [];

  return (
    <div className="relative lg:hidden">
      {/* Toggle button */}
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        className="relative h-10 w-10 shrink-0 rounded-md p-0"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls="mobile-nav-panel"
      >
        <span className="relative h-5 w-5">
          <Menu
            className={cn(
              "absolute inset-0 h-5 w-5 transition-all duration-200",
              isOpen
                ? "rotate-90 scale-75 opacity-0"
                : "rotate-0 scale-100 opacity-100",
            )}
          />
          <X
            className={cn(
              "absolute inset-0 h-5 w-5 transition-all duration-200",
              isOpen
                ? "rotate-0 scale-100 opacity-100"
                : "-rotate-90 scale-75 opacity-0",
            )}
          />
        </span>
      </Button>

      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={() => setIsOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-sm",
          "transition-opacity duration-200",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      />

      {/* Dropdown panel */}
      <div
        id="mobile-nav-panel"
        role="dialog"
        aria-modal="false"
        aria-label="Site navigation"
        className={cn(
          "fixed right-3 top-[calc(var(--header-h)+0.5rem)] z-[70]",
          "w-72 max-w-[calc(100vw-1.5rem)]",
          "flex max-h-[calc(100vh-var(--header-h)-1rem)] min-h-0 flex-col overflow-hidden",
          "max-h-[calc(100dvh-var(--header-h)-1rem)]",
          "rounded-lg border border-border bg-background shadow-xl",
          "origin-top-right transition-all duration-200 ease-out",
          isOpen
            ? "scale-100 opacity-100 translate-y-0 pointer-events-auto"
            : "scale-95 opacity-0 -translate-y-1 pointer-events-none",
        )}
      >
        <nav
          aria-label="Site navigation"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
        >
          {/* Site nav section */}
          {hasSiteNav && (
            <ul className="p-2 space-y-0.5">
              {tree.map((item) => (
                <MobileMenuItem
                  key={item.id}
                  item={item}
                  onClose={() => setIsOpen(false)}
                />
              ))}
            </ul>
          )}

          {/* Admin nav section */}
          {isBackendUser && (
            <>
              {hasSiteNav && <div className="mx-2 border-t border-border" />}
              <div className="px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Admin
                </p>
              </div>
              <ul className="px-2 pb-2 space-y-0.5">
                {backendLinks.map((link) => (
                  <AdminNavLink
                    key={link.href}
                    href={link.href}
                    label={link.label}
                    onClose={() => setIsOpen(false)}
                    isChild={link.isChild}
                  />
                ))}
                {adminLinks.map((link) => (
                  <AdminNavLink
                    key={link.href}
                    href={link.href}
                    label={link.label}
                    onClose={() => setIsOpen(false)}
                  />
                ))}
              </ul>
            </>
          )}

          {/* Auth section */}
          <div className="mx-2 border-t border-border" />
          <div className="p-2">
            {isLoggedIn ? (
              <div className="flex items-center gap-3 px-3 py-2">
                <UserButtonClient />
                <span className="text-sm font-medium">Account</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <SignInButton mode="modal">
                  <button
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium",
                      "min-h-[44px] transition-colors duration-150",
                      "hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-foreground)]",
                      "focus-visible:bg-[var(--nav-hover-bg)] focus-visible:text-[var(--nav-hover-foreground)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium",
                      "min-h-[44px] transition-colors duration-150",
                      "hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-foreground)]",
                      "focus-visible:bg-[var(--nav-hover-bg)] focus-visible:text-[var(--nav-hover-foreground)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    Sign up
                  </button>
                </SignUpButton>
              </div>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}
