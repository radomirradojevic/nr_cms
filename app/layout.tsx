import type { Metadata } from "next";
import { headers } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/themes";
import { Geist, Geist_Mono } from "next/font/google";
import { getRoles, hasRole } from "@/lib/roles";
import { SiteFooter, resolveFooterMinHeight } from "@/components/site-footer";
import { SiteHeader, resolveHeaderHeight } from "@/components/site-header";
import { SiteMain } from "@/components/site-main";
import { getGlobalSettings } from "@/data/global-settings";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { I18nProvider } from "@/components/i18n-provider";
import { SessionSecurityProvider } from "@/components/session-security-provider";
import { RegionalSettingsProvider } from "@/components/regional-settings-provider";
import { ShellVisibilityController } from "@/components/shell-visibility-controller";
import { cn } from "@/lib/utils";
import {
  cmsLanguageToLocale,
  getCmsLanguageDirection,
} from "@/lib/i18n/languages";
import { en } from "@/lib/i18n/messages/en";
import { loadMessages } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/translate";
import { cssVarsToInlineStyle, resolveAppearance } from "@/lib/appearance";
import { resolveAppearanceMotionAttributes } from "@/lib/appearance-recipe";
import { resolveGlowCssVars } from "@/lib/glow";
import { resolveHasLicenseServerShellForMenu } from "@/lib/license-server-addon/menu-access";
import { loadShellRouteIndex } from "@/lib/shell-visibility";
import {
  resolveShellRenderTargetForPathname,
  shouldShowShellForTarget,
} from "@/lib/shell-visibility-targets";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getGlobalSettings();

  return {
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getOptionalCurrentUser(true);
  const roles = getRoles(user?.publicMetadata);
  const isBackendUser =
    hasRole(roles, "admin") ||
    hasRole(roles, "publisher") ||
    hasRole(roles, "author");
  const isAdmin = hasRole(roles, "admin");
  const settings = await getGlobalSettings();
  const shellRouteIndex = await loadShellRouteIndex();
  const hasWebshopShell = shellRouteIndex.contents.some(
    (item) => item.contentType === "webshop",
  );
  const hasLicenseServerShell =
    await resolveHasLicenseServerShellForMenu(isAdmin);
  const requestHeaders = await headers();
  const currentPathname = requestHeaders.get("x-nr-pathname") ?? "/";
  const frontendLanguage = settings.languages.frontendLanguage;
  const frontendDirection = getCmsLanguageDirection(frontendLanguage);
  const frontendMessages = await loadMessages(frontendLanguage);
  const frontendTranslator = createTranslator(
    frontendMessages,
    en,
    frontendLanguage,
  );
  const shellTarget = resolveShellRenderTargetForPathname(
    currentPathname,
    shellRouteIndex,
  );
  const siteName = settings.siteName;
  const logoUrl = settings.siteLogo
    ? `/api/files/${settings.siteLogo.fileId}`
    : null;
  const recipe = settings.resolvedAppearanceRecipe;
  const headerRegion = recipe.shell.header;
  const footerRegion = recipe.shell.footer;
  const mainRegion = recipe.shell.main;
  const headerHiddenByVisibility = !shouldShowShellForTarget(
    settings.headerSettings.visibility,
    shellTarget,
  );
  const footerHiddenByVisibility = !shouldShowShellForTarget(
    settings.footerSettings.visibility,
    shellTarget,
  );
  const headerHiddenByConfiguration =
    headerRegion.hidden || settings.headerSettings.hidden;
  const footerHiddenByConfiguration =
    footerRegion.hidden ||
    settings.footerSettings.hidden ||
    footerRegion.variant === "hidden";
  const headerIsVisible =
    !headerHiddenByConfiguration && !headerHiddenByVisibility;
  const footerIsVisible =
    !footerHiddenByConfiguration && !footerHiddenByVisibility;
  const headerRegionForRender = headerHiddenByConfiguration
    ? { ...headerRegion, hidden: true }
    : headerRegion;
  const footerRegionForRender = footerHiddenByConfiguration
    ? { ...footerRegion, hidden: true }
    : footerRegion;
  const headerIsSticky = headerIsVisible && headerRegion.sticky;
  const footerIsSticky = footerIsVisible && footerRegion.sticky;
  const resolvedHeaderHeight = resolveHeaderHeight(headerRegion);
  const resolvedFooterMinHeight = resolveFooterMinHeight(footerRegion);
  const headerH = headerIsVisible ? resolvedHeaderHeight : 0;
  const footerMinHeight = footerIsVisible ? resolvedFooterMinHeight : 0;
  const stickyFooterH = footerMinHeight;
  const appearance = resolveAppearance(recipe.tokens);
  const motion = resolveAppearanceMotionAttributes(recipe.motion);
  const backgroundEffectsEnabled = motion.backgroundEffects !== "disabled";
  const headerGlowVars =
    backgroundEffectsEnabled && !headerHiddenByConfiguration
      ? resolveGlowCssVars(headerRegion.glow, "header", "bottom")
      : {};
  const footerGlowVars =
    backgroundEffectsEnabled && !footerHiddenByConfiguration
      ? resolveGlowCssVars(footerRegion.glow, "footer", "top")
      : {};
  const rootStyle = {
    ...cssVarsToInlineStyle(appearance.cssVars),
    ...(headerGlowVars as React.CSSProperties),
    ...(footerGlowVars as React.CSSProperties),
    ["--header-h" as string]: `${headerH}px`,
    ["--footer-min-h" as string]: `${footerMinHeight}px`,
    ...(headerIsSticky
      ? { ["--sticky-header-h" as string]: `${headerH}px` }
      : {}),
    ...(footerIsSticky && stickyFooterH > 0
      ? { ["--sticky-footer-h" as string]: `${stickyFooterH}px` }
      : {}),
  } as React.CSSProperties;
  return (
    <html
      lang={cmsLanguageToLocale(frontendLanguage)}
      dir={frontendDirection}
      className={cn(
        appearance.htmlClass,
        geistSans.variable,
        geistMono.variable,
        "h-full antialiased",
      )}
      style={rootStyle}
      data-appearance-motion={motion.motionPreference}
      data-appearance-background-effects={motion.backgroundEffects}
      data-shell-header-visible={headerIsVisible ? "true" : "false"}
      data-shell-footer-visible={footerIsVisible ? "true" : "false"}
      suppressHydrationWarning
    >
      <head>
        {appearance.fontLinks.map((link) => (
          <link
            key={`${link.rel}:${link.href}`}
            rel={link.rel}
            href={link.href}
          />
        ))}
      </head>
      <body className="min-h-full min-h-dvh flex flex-col overflow-x-hidden">
        <ClerkProvider appearance={{ theme: shadcn }}>
          <RegionalSettingsProvider value={settings.regional}>
            <I18nProvider
              language={frontendLanguage}
              direction={frontendDirection}
              messages={frontendMessages}
            >
              <SessionSecurityProvider
                maxSessionDurationMinutes={
                  settings.sessionSecurity.maxSessionDurationMinutes
                }
                idleLogoutMinutes={settings.sessionSecurity.idleLogoutMinutes}
              >
                <ShellVisibilityController
                  routeIndex={shellRouteIndex}
                  headerVisibility={settings.headerSettings.visibility}
                  footerVisibility={settings.footerSettings.visibility}
                  headerConfigHidden={headerHiddenByConfiguration}
                  footerConfigHidden={footerHiddenByConfiguration}
                  headerHeight={resolvedHeaderHeight}
                  footerMinHeight={resolvedFooterMinHeight}
                  headerSticky={headerRegion.sticky}
                  footerSticky={footerRegion.sticky}
                />
                <SiteHeader
                  region={headerRegionForRender}
                  siteName={siteName}
                  siteLogo={settings.siteLogo}
                  logoUrl={logoUrl}
                  headerSettings={settings.headerSettings}
                  isBackendUser={isBackendUser}
                  isAdmin={isAdmin}
                  isLoggedIn={!!user}
                  hasLicenseServerShell={hasLicenseServerShell}
                  hasWebshopShell={hasWebshopShell}
                  t={frontendTranslator}
                />
                <SiteMain region={mainRegion}>{children}</SiteMain>
                <div className="contents" data-shell-footer-content>
                  <SiteFooter
                    region={footerRegionForRender}
                    isBackendUser={isBackendUser}
                    isAdmin={isAdmin}
                    isLoggedIn={!!user}
                    t={frontendTranslator}
                  />
                </div>
              </SessionSecurityProvider>
            </I18nProvider>
          </RegionalSettingsProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
