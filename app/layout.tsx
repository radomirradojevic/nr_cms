import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/themes";
import { Geist, Geist_Mono } from "next/font/google";
import { getRoles, hasRole } from "@/lib/roles";
import { SiteFooter, resolveFooterMinHeight } from "@/components/site-footer";
import { SiteHeader, resolveHeaderHeight } from "@/components/site-header";
import { SiteMain } from "@/components/site-main";
import { getGlobalSettings } from "@/data/global-settings";
import { getSessionSecuritySettings } from "@/lib/session-security";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { SessionSecurityProvider } from "@/components/session-security-provider";
import { RegionalSettingsProvider } from "@/components/regional-settings-provider";
import { cn } from "@/lib/utils";
import { cssVarsToInlineStyle, resolveAppearance } from "@/lib/appearance";
import { resolveAppearanceMotionAttributes } from "@/lib/appearance-recipe";
import { resolveGlowCssVars } from "@/lib/glow";
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
  const sessionSecurity = await getSessionSecuritySettings();
  const siteName = settings.siteName;
  const logoUrl = settings.siteLogo
    ? `/api/files/${settings.siteLogo.fileId}`
    : null;
  const recipe = settings.resolvedAppearanceRecipe;
  const headerRegion = recipe.shell.header;
  const footerRegion = recipe.shell.footer;
  const mainRegion = recipe.shell.main;
  const headerIsSticky = headerRegion.sticky;
  const footerIsSticky = footerRegion.sticky;
  const headerH = resolveHeaderHeight(headerRegion);
  const footerMinHeight = resolveFooterMinHeight(footerRegion);
  const stickyFooterH = footerMinHeight;
  const appearance = resolveAppearance(recipe.tokens);
  const motion = resolveAppearanceMotionAttributes(recipe.motion);
  const backgroundEffectsEnabled = motion.backgroundEffects !== "disabled";
  const headerGlowVars = backgroundEffectsEnabled
    ? resolveGlowCssVars(headerRegion.glow, "header", "bottom")
    : {};
  const footerGlowVars = backgroundEffectsEnabled
    ? resolveGlowCssVars(footerRegion.glow, "footer", "top")
    : {};
  const rootStyle = {
    ...cssVarsToInlineStyle(appearance.cssVars),
    ...(headerGlowVars as React.CSSProperties),
    ...(footerGlowVars as React.CSSProperties),
    ["--header-h" as string]: `${headerH}px`,
    ...(headerIsSticky
      ? { ["--sticky-header-h" as string]: `${headerH}px` }
      : {}),
    ...(footerIsSticky && stickyFooterH > 0
      ? { ["--sticky-footer-h" as string]: `${stickyFooterH}px` }
      : {}),
  } as React.CSSProperties;
  return (
    <html
      lang={settings.regional.defaultLanguage}
      className={cn(
        appearance.htmlClass,
        geistSans.variable,
        geistMono.variable,
        "h-full antialiased",
      )}
      style={rootStyle}
      data-appearance-motion={motion.motionPreference}
      data-appearance-background-effects={motion.backgroundEffects}
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
            <SessionSecurityProvider
              maxSessionDurationMinutes={
                sessionSecurity.maxSessionDurationMinutes
              }
              idleLogoutMinutes={sessionSecurity.idleLogoutMinutes}
            >
              <SiteHeader
                region={headerRegion}
                siteName={siteName}
                siteLogo={settings.siteLogo}
                logoUrl={logoUrl}
                headerSettings={settings.headerSettings}
                isBackendUser={isBackendUser}
                isAdmin={isAdmin}
                isLoggedIn={!!user}
              />
              <SiteMain
                region={mainRegion}
                headerPaddingPx={headerIsSticky && headerH > 0 ? headerH : 0}
                footerPaddingPx={
                  footerIsSticky && stickyFooterH > 0 ? stickyFooterH : 0
                }
              >
                {children}
              </SiteMain>
              <SiteFooter
                region={footerRegion}
                isBackendUser={isBackendUser}
                isAdmin={isAdmin}
                isLoggedIn={!!user}
              />
            </SessionSecurityProvider>
          </RegionalSettingsProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
