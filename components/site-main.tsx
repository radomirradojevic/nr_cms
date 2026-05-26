import type { MainRegionV1 } from "@/lib/appearance-recipe";
import { cn } from "@/lib/utils";

type SiteMainProps = {
  region: MainRegionV1;
  headerPaddingPx: number;
  footerPaddingPx: number;
  children?: React.ReactNode;
};

function mainInnerClassName(variant: MainRegionV1["variant"]): string {
  switch (variant) {
    case "framed":
      return "site-content-container mx-auto w-full px-4 py-6";
    case "full-bleed-builder":
      return "w-full min-w-0";
    case "editorial-article":
      return "site-content-container mx-auto w-full max-w-[min(var(--frontend-content-max-width),75ch)] px-4 py-8";
    case "category-grid":
      return "site-content-container mx-auto w-full px-4 py-6";
    case "normal":
      return "site-content-container mx-auto w-full px-4";
  }
}

function mainOuterClassName(variant: MainRegionV1["variant"]): string {
  switch (variant) {
    case "framed":
      return "bg-muted/30";
    case "full-bleed-builder":
      return "min-w-0";
    case "editorial-article":
      return "bg-background";
    case "category-grid":
      return "bg-muted/20";
    case "normal":
      return "";
  }
}

function mainSurfaceClassName(variant: MainRegionV1["variant"]): string {
  switch (variant) {
    case "framed":
      return "rounded-lg border bg-background p-4 shadow-sm md:p-6";
    case "editorial-article":
      return "prose prose-neutral max-w-none dark:prose-invert";
    case "category-grid":
      return "min-w-0";
    case "full-bleed-builder":
    case "normal":
      return "";
  }
}

export function SiteMain({
  region,
  headerPaddingPx,
  footerPaddingPx,
  children,
}: SiteMainProps) {
  const variant = region.variant;
  const surfaceClassName = mainSurfaceClassName(variant);

  return (
    <main
      className={cn("site-main flex-1", mainOuterClassName(variant))}
      data-main-variant={variant}
      style={{
        ...(headerPaddingPx > 0 ? { paddingTop: `${headerPaddingPx}px` } : {}),
        ...(footerPaddingPx > 0
          ? {
              paddingBottom: `calc(${footerPaddingPx}px + env(safe-area-inset-bottom, 0px))`,
            }
          : {}),
      }}
    >
      <div className={mainInnerClassName(variant)}>
        {surfaceClassName ? (
          <div className={surfaceClassName}>{children}</div>
        ) : (
          children
        )}
      </div>
    </main>
  );
}
