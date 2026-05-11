import { getPublishedFormById } from "@/data/forms";
import { CmsFormRenderer } from "@/components/cms-form-renderer";
import type { FormProps } from "./types";

/**
 * Server-side renderer for the Form page-builder block. Fetches the
 * referenced form (only when published) and renders the public form via
 * `<CmsFormRenderer>`. Lives in its own file so the async server component
 * is never imported by the editor's client bundle.
 */
export async function FormStatic({ formId, formName }: FormProps) {
  if (!formId) {
    // No form selected — render nothing on the public site rather than a
    // builder-facing placeholder. Authors see the placeholder inside the
    // page builder (see `Form` in editable.tsx).
    return null;
  }
  const detail = await getPublishedFormById(formId);
  if (!detail) {
    return (
      <div className="my-4 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        Form not available{formName ? ` ("${formName}")` : ""}.
      </div>
    );
  }
  return <CmsFormRenderer form={detail} />;
}
