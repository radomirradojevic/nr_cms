import Link from "next/link";

import { Button } from "@/components/ui/button";
import type {
  AppearanceLinkV1,
  AppearanceSlotV1,
  FooterRegionV1,
} from "@/lib/appearance-recipe";
import { sanitizeCmsHtml } from "@/lib/content-sanitizer";
import { cn } from "@/lib/utils";

type SlotOf<T extends AppearanceSlotV1["type"]> = Extract<
  AppearanceSlotV1,
  { type: T }
>;

type SiteFooterProps = {
  region: FooterRegionV1;
  isBackendUser?: boolean;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
};

type FooterContext = Required<
  Pick<SiteFooterProps, "isBackendUser" | "isAdmin" | "isLoggedIn">
>;

function slotIsVisible(
  slot: AppearanceSlotV1,
  context: FooterContext,
): boolean {
  if (!slot.enabled) return false;

  switch (slot.visibility) {
    case "signed-out":
      return !context.isLoggedIn;
    case "signed-in":
      return context.isLoggedIn;
    case "backend-user":
      return context.isBackendUser;
    case "admin":
      return context.isAdmin;
    case "always":
      return true;
  }
}

function enabledSlots<T extends AppearanceSlotV1["type"]>(
  slots: AppearanceSlotV1[],
  type: T,
  context: FooterContext,
): Array<SlotOf<T>> {
  return slots.filter(
    (slot) => slot.type === type && slotIsVisible(slot, context),
  ) as Array<SlotOf<T>>;
}

function firstEnabledSlot<T extends AppearanceSlotV1["type"]>(
  slots: AppearanceSlotV1[],
  type: T,
  context: FooterContext,
): SlotOf<T> | null {
  return (slots.find(
    (slot) => slot.type === type && slotIsVisible(slot, context),
  ) ?? null) as SlotOf<T> | null;
}

export function resolveFooterMinHeight(region: FooterRegionV1): number {
  return region.variant === "hidden" ? 0 : region.minHeightPx;
}

function renderSlotLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={className} rel="noreferrer" target="_blank">
      {children}
    </a>
  );
}

function renderFooterHtmlSlot(slot: SlotOf<"CustomHtml"> | SlotOf<"RichText">) {
  if (!slot.html) return null;

  return (
    <div
      key={slot.id}
      className="cms-content min-w-0 max-w-full text-sm [&_a]:underline [&_a]:hover:text-foreground"
      dangerouslySetInnerHTML={{
        __html: sanitizeCmsHtml(slot.html),
      }}
    />
  );
}

function renderCopyrightSlot(slot: SlotOf<"Copyright">) {
  if (!slot.text) return null;

  return (
    <div
      key={slot.id}
      className="min-w-0 max-w-full break-words sm:shrink-0 sm:text-right"
    >
      <span>{slot.text}</span>
    </div>
  );
}

function renderLinks(
  links: AppearanceLinkV1[],
  label: string,
  className?: string,
) {
  if (links.length === 0) return null;

  return (
    <nav aria-label={label} className={cn("flex flex-wrap gap-3", className)}>
      {links.map((link) => (
        <span key={`${link.href}:${link.label}`}>
          {renderSlotLink({
            href: link.href,
            className: "underline-offset-4 hover:underline",
            children: link.label,
          })}
        </span>
      ))}
    </nav>
  );
}

function renderLinkSlot(
  slot:
    | SlotOf<"FooterLinks">
    | SlotOf<"LegalLinks">
    | SlotOf<"SocialLinks">
    | null,
  label: string,
  className?: string,
) {
  if (!slot) return null;
  return renderLinks(slot.links, label, className);
}

function renderCtaSlot(slot: SlotOf<"CTA"> | null) {
  if (!slot?.href || !slot.label) return null;

  const variant =
    slot.style === "secondary"
      ? "outline"
      : slot.style === "link"
        ? "ghost"
        : "default";

  return (
    <Button asChild variant={variant}>
      {renderSlotLink({ href: slot.href, children: slot.label })}
    </Button>
  );
}

function footerStyle(region: FooterRegionV1): React.CSSProperties {
  const minHeight = resolveFooterMinHeight(region);

  return {
    ...(minHeight > 0 ? { minHeight: `${minHeight}px` } : {}),
    ...(region.background ? { backgroundColor: region.background } : {}),
  };
}

export function SiteFooter({
  region,
  isBackendUser = false,
  isAdmin = false,
  isLoggedIn = false,
}: SiteFooterProps) {
  if (region.variant === "hidden") return null;

  const context = { isBackendUser, isAdmin, isLoggedIn };
  const htmlSlots = [
    ...enabledSlots(region.slots, "CustomHtml", context),
    ...enabledSlots(region.slots, "RichText", context),
  ];
  const copyrightSlots = enabledSlots(region.slots, "Copyright", context);
  const footerLinksSlot = firstEnabledSlot(
    region.slots,
    "FooterLinks",
    context,
  );
  const legalLinksSlot = firstEnabledSlot(region.slots, "LegalLinks", context);
  const socialLinksSlot = firstEnabledSlot(
    region.slots,
    "SocialLinks",
    context,
  );
  const ctaSlot = firstEnabledSlot(region.slots, "CTA", context);
  const renderedClassicSlots = [
    ...htmlSlots.map(renderFooterHtmlSlot),
    ...copyrightSlots.map(renderCopyrightSlot),
  ].filter(Boolean);
  const baseClassName = cn(
    "site-footer bg-background mt-auto px-4 py-8 text-sm text-muted-foreground sm:px-6",
    region.sticky && "sticky bottom-0 z-50",
  );

  if (region.variant === "classic") {
    return (
      <footer className={baseClassName} style={footerStyle(region)}>
        {renderedClassicSlots.length > 0 && (
          <div className="site-content-container mx-auto flex w-full min-w-0 flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-6">
            {renderedClassicSlots}
          </div>
        )}
      </footer>
    );
  }

  if (region.variant === "centered") {
    return (
      <footer
        className={cn(baseClassName, "text-center")}
        style={footerStyle(region)}
      >
        <div className="site-content-container mx-auto flex w-full min-w-0 flex-col items-center gap-4">
          {htmlSlots.map(renderFooterHtmlSlot)}
          {renderCtaSlot(ctaSlot)}
          {renderLinkSlot(footerLinksSlot, "Footer links", "justify-center")}
          {renderLinkSlot(socialLinksSlot, "Social links", "justify-center")}
          {renderLinkSlot(
            legalLinksSlot,
            "Legal links",
            "justify-center text-xs",
          )}
          {copyrightSlots.map(renderCopyrightSlot)}
        </div>
      </footer>
    );
  }

  if (region.variant === "multi-column") {
    return (
      <footer className={baseClassName} style={footerStyle(region)}>
        <div className="site-content-container mx-auto grid w-full min-w-0 gap-6 md:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)_minmax(12rem,1fr)]">
          <div className="min-w-0 space-y-4">
            {htmlSlots.map(renderFooterHtmlSlot)}
            {copyrightSlots.map(renderCopyrightSlot)}
          </div>
          <div className="min-w-0 space-y-3">
            {renderLinkSlot(footerLinksSlot, "Footer links", "flex-col gap-2")}
            {renderLinkSlot(
              legalLinksSlot,
              "Legal links",
              "flex-col gap-2 text-xs",
            )}
          </div>
          <div className="min-w-0 space-y-4 md:text-right">
            {renderCtaSlot(ctaSlot)}
            {renderLinkSlot(
              socialLinksSlot,
              "Social links",
              "justify-start md:justify-end",
            )}
          </div>
        </div>
      </footer>
    );
  }

  if (region.variant === "CTA") {
    return (
      <footer className={baseClassName} style={footerStyle(region)}>
        <div className="site-content-container mx-auto flex w-full min-w-0 flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 space-y-3">
            {htmlSlots.map(renderFooterHtmlSlot)}
            {renderLinkSlot(footerLinksSlot, "Footer links")}
            {renderLinkSlot(legalLinksSlot, "Legal links", "text-xs")}
            {copyrightSlots.map(renderCopyrightSlot)}
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
            {renderCtaSlot(ctaSlot)}
            {renderLinkSlot(
              socialLinksSlot,
              "Social links",
              "justify-start md:justify-end",
            )}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer
      className={cn(
        "site-footer bg-background mt-auto px-4 py-4 text-xs text-muted-foreground sm:px-6",
        region.sticky && "sticky bottom-0 z-50",
      )}
      style={footerStyle(region)}
    >
      <div className="site-content-container mx-auto flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          {htmlSlots.map(renderFooterHtmlSlot)}
          {copyrightSlots.map(renderCopyrightSlot)}
        </div>
        <div className="flex min-w-0 flex-wrap gap-3 sm:justify-end">
          {renderLinkSlot(footerLinksSlot, "Footer links")}
          {renderLinkSlot(legalLinksSlot, "Legal links")}
          {renderLinkSlot(socialLinksSlot, "Social links")}
          {renderCtaSlot(ctaSlot)}
        </div>
      </div>
    </footer>
  );
}
