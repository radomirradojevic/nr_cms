import type { PageTemplateV1 } from "@/lib/appearance-recipe";
import { cn } from "@/lib/utils";

type PageTemplateProps = {
  template: PageTemplateV1;
  children?: React.ReactNode;
};

export function PageTemplate({ template, children }: PageTemplateProps) {
  const variant = template.variant;

  return (
    <div
      className={cn(
        "page-template w-full",
        variant === "contained-builder" &&
          "mx-auto max-w-[var(--frontend-content-max-width)] px-2 py-12 sm:py-16",
        variant === "framed-builder" &&
          "mx-auto max-w-[var(--frontend-content-max-width)] px-2 py-10 sm:py-14",
        variant === "full-bleed-builder" &&
          "relative left-1/2 ml-[-50vw] mr-[-50vw] w-screen max-w-none px-4 py-0 md:px-8",
        variant === "landing-mode" &&
          "relative left-1/2 ml-[-50vw] mr-[-50vw] w-screen max-w-none py-0",
      )}
      data-page-template={variant}
    >
      {variant === "framed-builder" ? (
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm sm:p-6">
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
