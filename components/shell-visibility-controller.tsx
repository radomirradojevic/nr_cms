"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

import type { HeaderSettings, FooterSettings } from "@/lib/global-settings";
import {
  resolveShellRenderTargetForPathname,
  shouldShowShellForTarget,
  type ShellRouteIndex,
} from "@/lib/shell-visibility-targets";

type ShellVisibilityControllerProps = {
  routeIndex: ShellRouteIndex;
  headerVisibility: HeaderSettings["visibility"];
  footerVisibility: FooterSettings["visibility"];
  headerConfigHidden: boolean;
  footerConfigHidden: boolean;
  headerHeight: number;
  footerMinHeight: number;
  headerSticky: boolean;
  footerSticky: boolean;
};

function setPxVar(root: HTMLElement, name: string, value: number) {
  root.style.setProperty(name, `${Math.max(0, value)}px`);
}

export function ShellVisibilityController({
  routeIndex,
  headerVisibility,
  footerVisibility,
  headerConfigHidden,
  footerConfigHidden,
  headerHeight,
  footerMinHeight,
  headerSticky,
  footerSticky,
}: ShellVisibilityControllerProps) {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const target = resolveShellRenderTargetForPathname(
      pathname || "/",
      routeIndex,
    );
    const headerVisible =
      !headerConfigHidden && shouldShowShellForTarget(headerVisibility, target);
    const footerVisible =
      !footerConfigHidden && shouldShowShellForTarget(footerVisibility, target);
    const root = document.documentElement;

    root.dataset.shellHeaderVisible = headerVisible ? "true" : "false";
    root.dataset.shellFooterVisible = footerVisible ? "true" : "false";
    setPxVar(root, "--header-h", headerVisible ? headerHeight : 0);
    setPxVar(
      root,
      "--sticky-header-h",
      headerVisible && headerSticky ? headerHeight : 0,
    );
    setPxVar(
      root,
      "--sticky-footer-h",
      footerVisible && footerSticky ? footerMinHeight : 0,
    );
  }, [
    footerConfigHidden,
    footerMinHeight,
    footerSticky,
    footerVisibility,
    headerConfigHidden,
    headerHeight,
    headerSticky,
    headerVisibility,
    pathname,
    routeIndex,
  ]);

  return null;
}
