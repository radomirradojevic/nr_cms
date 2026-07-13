import Link from "next/link";
import { Mail, type LucideIcon } from "lucide-react";
import * as SimpleIcons from "simple-icons";
import type { SimpleIcon } from "simple-icons";

import { Button } from "@/components/ui/button";
import type {
  AppearanceLinkV1,
  AppearanceSlotV1,
  FooterRegionV1,
} from "@/lib/appearance-recipe";
import { sanitizeCmsHtml } from "@/lib/content-sanitizer";
import { en } from "@/lib/i18n/messages/en";
import { createTranslator } from "@/lib/i18n/translate";
import type { TranslateFn } from "@/lib/i18n/translate";
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
  t?: TranslateFn;
};

type FooterContext = Required<
  Pick<SiteFooterProps, "isBackendUser" | "isAdmin" | "isLoggedIn">
>;

const SIMPLE_ICON_EXPORTS = SimpleIcons as Record<string, SimpleIcon>;

const SOCIAL_ICON_ALIASES: Record<string, string> = {
  x: "siX",
  twitter: "siX",
  twitterx: "siX",
  youtube: "siYoutube",
  youtubemusic: "siYoutubemusic",
  youtubeshorts: "siYoutubeshorts",
  youtu: "siYoutube",
  github: "siGithub",
  gitlab: "siGitlab",
  linkedin: "siLinkedin",
  tiktok: "siTiktok",
  tik_tok: "siTiktok",
  whatsapp: "siWhatsapp",
  telegram: "siTelegram",
  facebook: "siFacebook",
  instagram: "siInstagram",
  threads: "siThreads",
  bluesky: "siBluesky",
  mastodon: "siMastodon",
  discord: "siDiscord",
  reddit: "siReddit",
  twitch: "siTwitch",
  pinterest: "siPinterest",
  snapchat: "siSnapchat",
  medium: "siMedium",
  substack: "siSubstack",
  dribbble: "siDribbble",
  behance: "siBehance",
  vimeo: "siVimeo",
  spotify: "siSpotify",
  soundcloud: "siSoundcloud",
  rss: "siRss",
  podcast: "siApplepodcasts",
};

const SOCIAL_ICON_MONOGRAMS: Record<string, string> = {
  linkedin: "in",
};

const SOCIAL_ICON_COMPONENTS: Partial<Record<string, LucideIcon>> = {
  email: Mail,
  mail: Mail,
};

const defaultTranslate = createTranslator(en, en, "en");

type ResolvedSocialIcon =
  | { type: "component"; Icon: LucideIcon }
  | { type: "simple"; icon: SimpleIcon }
  | { type: "monogram"; label: string };

function normalizeSocialToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, "plus")
    .replace(/\./g, "dot")
    .replace(/[^a-z0-9]+/g, "");
}

function variableNameFromToken(token: string): string {
  return `si${token.charAt(0).toUpperCase()}${token.slice(1)}`;
}

function candidateTokensFromHref(href: string): string[] {
  if (href.startsWith("mailto:")) return ["email", "mail"];

  try {
    const parsed = new URL(href);
    const hostParts = parsed.hostname
      .replace(/^www\./, "")
      .toLowerCase()
      .split(".");
    const domain = hostParts.length > 1 ? hostParts.at(-2) : hostParts[0];
    return domain ? [domain] : [];
  } catch {
    return [];
  }
}

function resolveSocialIcon(link: AppearanceLinkV1): ResolvedSocialIcon | null {
  const tokens = [
    normalizeSocialToken(link.label),
    ...candidateTokensFromHref(link.href).map(normalizeSocialToken),
  ].filter(Boolean);

  for (const token of tokens) {
    const Icon = SOCIAL_ICON_COMPONENTS[token];
    if (Icon) return { type: "component", Icon };

    const aliasedIcon = SOCIAL_ICON_ALIASES[token];
    const icon =
      (aliasedIcon ? SIMPLE_ICON_EXPORTS[aliasedIcon] : undefined) ??
      SIMPLE_ICON_EXPORTS[variableNameFromToken(token)];

    if (icon?.path) return { type: "simple", icon };

    const monogram = SOCIAL_ICON_MONOGRAMS[token];
    if (monogram) return { type: "monogram", label: monogram };
  }

  return null;
}

function renderSocialIcon(link: AppearanceLinkV1) {
  const icon = resolveSocialIcon(link);
  if (!icon) return null;

  if (icon.type === "monogram") {
    return (
      <span
        aria-hidden="true"
        className="text-[0.8rem] font-semibold leading-none"
      >
        {icon.label}
      </span>
    );
  }

  if (icon.type === "component") {
    const Icon = icon.Icon;
    return <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={2} />;
  }

  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 fill-current"
      role="img"
      viewBox="0 0 24 24"
    >
      <path d={icon.icon.path} />
    </svg>
  );
}

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
  return region.hidden || region.variant === "hidden" ? 0 : region.minHeightPx;
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

  if (/^(mailto:|tel:)/i.test(href)) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
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
  generateSocialIcons = false,
) {
  if (links.length === 0) return null;

  return (
    <nav
      aria-label={label}
      className={cn(
        "flex flex-wrap items-center gap-3",
        generateSocialIcons && "items-center gap-2",
        className,
      )}
    >
      {links.map((link) => {
        const icon = generateSocialIcons ? renderSocialIcon(link) : null;

        return (
          <span key={`${link.href}:${link.label}`}>
            {renderSlotLink({
              href: link.href,
              className: cn(
                "underline-offset-4 hover:underline",
                icon &&
                  "inline-flex h-5 w-5 items-center justify-center rounded-sm align-middle no-underline transition-colors hover:text-foreground hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              ),
              children: icon ? (
                <>
                  {icon}
                  <span className="sr-only">{link.label}</span>
                </>
              ) : (
                link.label
              ),
            })}
          </span>
        );
      })}
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
  return renderLinks(
    slot.links,
    label,
    className,
    slot.type === "SocialLinks" ? slot.generateSocialIcons : false,
  );
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
  t = defaultTranslate,
}: SiteFooterProps) {
  if (region.hidden || region.variant === "hidden") return null;

  const context = { isBackendUser, isAdmin, isLoggedIn };
  const customHtmlSlots = enabledSlots(region.slots, "CustomHtml", context);
  const richTextSlots = enabledSlots(region.slots, "RichText", context);
  const htmlSlots =
    customHtmlSlots.length > 0 ? customHtmlSlots : richTextSlots;
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
          {renderLinkSlot(
            footerLinksSlot,
            t("shell.footerLinks"),
            "justify-center",
          )}
          {renderLinkSlot(
            socialLinksSlot,
            t("shell.socialLinks"),
            "justify-center",
          )}
          {renderLinkSlot(
            legalLinksSlot,
            t("shell.legalLinks"),
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
            {renderLinkSlot(
              footerLinksSlot,
              t("shell.footerLinks"),
              "flex-col gap-2",
            )}
            {renderLinkSlot(
              legalLinksSlot,
              t("shell.legalLinks"),
              "flex-col gap-2 text-xs",
            )}
          </div>
          <div className="min-w-0 space-y-4 md:text-right">
            {renderCtaSlot(ctaSlot)}
            {renderLinkSlot(
              socialLinksSlot,
              t("shell.socialLinks"),
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
            {renderLinkSlot(footerLinksSlot, t("shell.footerLinks"))}
            {renderLinkSlot(legalLinksSlot, t("shell.legalLinks"), "text-xs")}
            {copyrightSlots.map(renderCopyrightSlot)}
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
            {renderCtaSlot(ctaSlot)}
            {renderLinkSlot(
              socialLinksSlot,
              t("shell.socialLinks"),
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
        <div className="flex min-w-0 flex-wrap items-center gap-3 sm:justify-end">
          {renderLinkSlot(footerLinksSlot, t("shell.footerLinks"))}
          {renderLinkSlot(legalLinksSlot, t("shell.legalLinks"))}
          {renderLinkSlot(socialLinksSlot, t("shell.socialLinks"))}
          {renderCtaSlot(ctaSlot)}
        </div>
      </div>
    </footer>
  );
}
