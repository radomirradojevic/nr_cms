import { getPublishedFormById } from "@/data/forms";
import { CmsFormRenderer } from "@/components/cms-form-renderer";
import type { FormProps } from "./types";
import {
  applyBlockStyle,
  buildResponsiveCss,
  styleHash,
} from "./style/serialize";
import { cn } from "@/lib/utils";

/**
 * Server-side renderer for the Form page-builder block. Fetches the
 * referenced form (only when published) and renders the public form via
 * `<CmsFormRenderer>`. Lives in its own file so the async server component
 * is never imported by the editor's client bundle.
 */
export async function FormStatic({ formId, formName, style }: FormProps) {
  if (!formId) {
    return null;
  }
  const detail = await getPublishedFormById(formId);

  const { style: cssStyle, className } = applyBlockStyle(style);
  const scope = `bb-${styleHash(style ?? null)}`;
  const responsiveCss = buildResponsiveCss(style, scope);
  const wrapperClass = cn(className, responsiveCss ? scope : null);
  const hasStyle =
    Object.keys(cssStyle).length > 0 || !!wrapperClass || !!responsiveCss;

  const inner = !detail ? (
    <div className="my-4 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
      Form not available{formName ? ` ("${formName}")` : ""}.
    </div>
  ) : (
    <CmsFormRenderer form={detail} />
  );

  if (!hasStyle) return inner;
  return (
    <>
      {responsiveCss ? (
        <style dangerouslySetInnerHTML={{ __html: responsiveCss }} />
      ) : null}
      <div style={cssStyle} className={wrapperClass || undefined}>
        {inner}
      </div>
    </>
  );
}
