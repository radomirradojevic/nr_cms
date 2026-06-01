import type { MainRegionV1, PageTemplateV1 } from "@/lib/appearance-recipe";
import { cn } from "@/lib/utils";

type PageTemplateProps = {
  template: PageTemplateV1;
  mainVariant?: MainRegionV1["variant"];
  leading?: React.ReactNode;
  hasBody?: boolean;
  children?: React.ReactNode;
};

const builderFrameClassName =
  "rounded-lg border bg-card p-4 text-card-foreground shadow-sm sm:p-6";

function constrainedBuilderClassName() {
  return "mx-auto max-w-[var(--frontend-content-max-width)] px-2";
}

function fullBleedBuilderClassName() {
  return "relative left-1/2 ml-[-50vw] mr-[-50vw] w-screen max-w-none px-4 py-0 md:px-8";
}

function landingBuilderClassName() {
  return "relative left-1/2 ml-[-50vw] mr-[-50vw] w-screen max-w-none py-0";
}

export function PageTemplate({
  template,
  mainVariant,
  leading,
  hasBody,
  children,
}: PageTemplateProps) {
  const variant = template.variant;
  const hasLeading = leading !== undefined && leading !== null;
  const hasBodyContent = hasBody ?? children !== undefined;
  const shouldFrameBody =
    variant === "framed-builder" || (hasLeading && mainVariant === "framed");

  if (hasLeading) {
    return (
      <div
        className="page-template w-full"
        data-page-template={variant}
        data-leading-hero-slider="true"
        data-page-body-frame={shouldFrameBody ? "true" : undefined}
      >
        <div
          className={cn(
            "page-template-leading-hero",
            !hasBodyContent && "mb-5",
          )}
        >
          {leading}
        </div>
        {hasBodyContent ? (
          <div
            className={cn(
              "page-template-body mt-5 mb-5 w-full",
              shouldFrameBody || variant === "contained-builder"
                ? constrainedBuilderClassName()
                : null,
              variant === "full-bleed-builder" &&
                !shouldFrameBody &&
                fullBleedBuilderClassName(),
              variant === "landing-mode" &&
                !shouldFrameBody &&
                landingBuilderClassName(),
            )}
            data-page-template-body
          >
            {shouldFrameBody ? (
              <div className={builderFrameClassName}>{children}</div>
            ) : (
              children
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "page-template w-full",
        variant === "contained-builder" && constrainedBuilderClassName(),
        variant === "framed-builder" &&
          cn(constrainedBuilderClassName(), mainVariant !== "framed" && "py-5"),
        variant === "full-bleed-builder" && fullBleedBuilderClassName(),
        variant === "landing-mode" && landingBuilderClassName(),
      )}
      data-page-template={variant}
    >
      {variant === "framed-builder" ? (
        <div className={builderFrameClassName}>{children}</div>
      ) : (
        children
      )}
    </div>
  );
}
