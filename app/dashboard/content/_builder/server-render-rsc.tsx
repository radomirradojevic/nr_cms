import "server-only";
import { GalleryStatic } from "./blocks/gallery-static";
import { FormStatic } from "./blocks/form-static";
import { FormSubmissionsStatic } from "./blocks/form-submissions-static";
import {
  defaultStaticRegistry,
  renderTree,
  type StaticRegistry,
} from "./server-render";
import { isBuilderData } from "./types";

/**
 * RSC-only static registry. Extends the client-safe registry with the
 * async `GalleryStatic`, `FormStatic`, and `FormSubmissionsStatic` renderers
 * (which fetch data from the database).
 */
const rscRegistry: StaticRegistry = {
  ...defaultStaticRegistry,
  Gallery: GalleryStatic as never,
  Form: FormStatic as never,
  FormSubmissions: FormSubmissionsStatic as never,
};

/**
 * RSC entry point used by the public-facing pages (`app/page.tsx`,
 * `app/[slug]/page.tsx`). Renders a `BuilderData` envelope using the
 * full registry, including async block renderers like `GalleryStatic`.
 */
export function BuilderRender({ data }: { data: unknown }) {
  if (!isBuilderData(data)) return null;
  return renderTree(data, rscRegistry);
}
