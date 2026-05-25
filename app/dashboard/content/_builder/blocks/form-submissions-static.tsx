import { getFormForSubmissions } from "@/data/form-submissions";
import { FormSubmissionsRenderer } from "./form-submissions/renderer";
import { FormSubmissionsEmpty } from "@/components/form-submissions-empty";
import { FormSubmissionsError } from "@/components/form-submissions-error";
import type { FormSubmissionsProps } from "./types";
import {
  applyBlockStyle,
  buildResponsiveCss,
  styleHash,
} from "./style/serialize";
import { cn } from "@/lib/utils";

/**
 * Server-side renderer for the Form Submissions page-builder block.
 * Fetches the referenced form and submissions, then renders them
 * in the selected display mode (table or card).
 *
 * Lives in its own file so the async server component is never
 * imported by the editor's client bundle.
 */
export async function FormSubmissionsStatic({
  formId,
  displayMode = "table",
  pageSize = 10,
  sortField = "created_at",
  sortOrder = "desc",
  hideId = true,
  hideSubmitted = false,
  style,
}: FormSubmissionsProps) {
  const { style: cssStyle, className } = applyBlockStyle(style);
  const scope = `bb-${styleHash(style ?? null)}`;
  const responsiveCss = buildResponsiveCss(style, scope);
  const wrapperClass = cn(className, responsiveCss ? scope : null);
  const hasStyle =
    Object.keys(cssStyle).length > 0 || !!wrapperClass || !!responsiveCss;

  const wrap = (node: React.ReactNode) =>
    hasStyle ? (
      <>
        {responsiveCss ? (
          <style dangerouslySetInnerHTML={{ __html: responsiveCss }} />
        ) : null}
        <div style={cssStyle} className={wrapperClass || undefined}>
          {node}
        </div>
      </>
    ) : (
      node
    );

  try {
    if (!formId) {
      return wrap(<FormSubmissionsEmpty />);
    }

    // Fetch form metadata and fields
    const formData = await getFormForSubmissions(formId);
    if (!formData) {
      return wrap(<FormSubmissionsError message="Form not found." />);
    }

    // Use client-side renderer for pagination
    return wrap(
      <FormSubmissionsRenderer
        formId={formId}
        displayMode={displayMode}
        pageSize={pageSize}
        sortField={sortField}
        sortOrder={sortOrder}
        hideId={hideId}
        hideSubmitted={hideSubmitted}
        fields={formData.fields}
      />,
    );
  } catch (error) {
    console.error("[Form Submissions Block]", error);
    return wrap(<FormSubmissionsError message="Failed to load submissions." />);
  }
}
