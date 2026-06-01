import "server-only";
import { getContentById } from "@/data/content";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles } from "@/lib/roles";
import { canViewContent } from "@/lib/content-visibility";
import { HeroSliderRenderer } from "@/components/hero-slider-renderer";
import {
  applyBlockStyle,
  buildResponsiveCss,
  styleHash,
} from "./style/serialize";
import type { BlockStyle } from "./style/types";
import { cn } from "@/lib/utils";

export async function HeroSliderStatic({
  heroSliderId,
  heroSliderName,
  style,
}: {
  heroSliderId?: unknown;
  heroSliderName?: unknown;
  style?: BlockStyle;
}) {
  if (typeof heroSliderId !== "string" || !heroSliderId) return null;

  const row = await getContentById(heroSliderId);
  if (!row || row.contentType !== "hero_slider" || row.status !== "published") {
    return null;
  }

  const me = await getOptionalCurrentUser(true);
  const viewerRoles = me ? getRoles(me.publicMetadata) : null;
  if (!canViewContent(row.visibility, viewerRoles)) return null;

  const { style: cssStyle, className } = applyBlockStyle(style);
  const scope = `bb-${styleHash(style ?? null)}`;
  const responsiveCss = buildResponsiveCss(style, scope);
  const wrapperClass = cn(className, responsiveCss ? scope : null);
  const hasStyle =
    Object.keys(cssStyle).length > 0 || !!wrapperClass || !!responsiveCss;
  const inner = (
    <HeroSliderRenderer
      data={row.contentJson}
      label={typeof heroSliderName === "string" ? heroSliderName : row.title}
    />
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
