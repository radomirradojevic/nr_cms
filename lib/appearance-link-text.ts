import {
  APPEARANCE_RECIPE_MAX_LINKS,
  type AppearanceLinkV1,
} from "@/lib/appearance-recipe";

const EMAIL_ADDRESS = /^[^\s@<>"'|]+@[^\s@<>"'|]+\.[^\s@<>"'|]+$/i;
const EMAIL_LABEL_ALIASES = new Set(["email", "mail"]);

function normalizeLinkLabel(label: string, href: string): string {
  const trimmedLabel = label.trim();
  const labelToken = trimmedLabel.toLowerCase().replace(/[^a-z0-9]+/g, "");

  if (
    href.toLowerCase().startsWith("mailto:") &&
    EMAIL_LABEL_ALIASES.has(labelToken)
  ) {
    return "email";
  }

  return trimmedLabel;
}

export function normalizeAppearanceLinkHref(value: string): string {
  const href = value.trim();
  if (!href) return "";

  if (href.toLowerCase().startsWith("mailto:")) {
    return `mailto:${href.slice("mailto:".length).trim()}`;
  }

  if (EMAIL_ADDRESS.test(href)) {
    return `mailto:${href}`;
  }

  return href;
}

export function formatAppearanceLinksText(links: AppearanceLinkV1[]): string {
  return links.map((link) => `${link.label} | ${link.href}`).join("\n");
}

export function parseAppearanceLinksText(value: string): AppearanceLinkV1[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, APPEARANCE_RECIPE_MAX_LINKS)
    .map((line) => {
      const separatorIndex = line.indexOf("|");

      if (separatorIndex === -1) {
        const href = normalizeAppearanceLinkHref(line);
        return {
          label: href.toLowerCase().startsWith("mailto:") ? "email" : line,
          href,
        };
      }

      const href = normalizeAppearanceLinkHref(line.slice(separatorIndex + 1));
      return {
        label: normalizeLinkLabel(line.slice(0, separatorIndex), href),
        href,
      };
    })
    .filter((link) => link.label.length > 0 && link.href.length > 0);
}
