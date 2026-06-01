import "server-only";
import { GalleryStatic } from "./blocks/gallery-static";
import { FormStatic } from "./blocks/form-static";
import { FormSubmissionsStatic } from "./blocks/form-submissions-static";
import { HeroSliderStatic } from "./blocks/hero-slider-static";
import {
  defaultStaticRegistry,
  getLeadingHeroSliderNodeId,
  hasBodyAfterLeadingHeroSlider,
  omitLeadingHeroSlider,
  renderNode,
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
  HeroSlider: HeroSliderStatic as never,
  Form: FormStatic as never,
  FormSubmissions: FormSubmissionsStatic as never,
};

/**
 * RSC entry point used by the public-facing pages (`app/page.tsx`,
 * `app/[slug]/page.tsx`). Renders a `BuilderData` envelope using the
 * full registry, including async block renderers like `GalleryStatic`.
 */
export function builderHasLeadingHeroSlider(data: unknown): boolean {
  return isBuilderData(data) && getLeadingHeroSliderNodeId(data) !== null;
}

export function builderHasBodyAfterLeadingHero(data: unknown): boolean {
  return isBuilderData(data) && hasBodyAfterLeadingHeroSlider(data);
}

export function BuilderLeadingHeroSlider({ data }: { data: unknown }) {
  if (!isBuilderData(data)) return null;
  const leadingHeroId = getLeadingHeroSliderNodeId(data);
  if (!leadingHeroId) return null;
  return renderNode(leadingHeroId, data.nodes, rscRegistry);
}

export function BuilderRender({
  data,
  omitLeadingHero = false,
}: {
  data: unknown;
  omitLeadingHero?: boolean;
}) {
  if (!isBuilderData(data)) return null;
  if (omitLeadingHero && !hasBodyAfterLeadingHeroSlider(data)) return null;
  return renderTree(
    omitLeadingHero ? omitLeadingHeroSlider(data) : data,
    rscRegistry,
  );
}
