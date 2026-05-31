import "server-only";
import { getContentById } from "@/data/content";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles } from "@/lib/roles";
import { canViewContent } from "@/lib/content-visibility";
import { HeroSliderRenderer } from "@/components/hero-slider-renderer";

export async function HeroSliderStatic({
  heroSliderId,
  heroSliderName,
}: {
  heroSliderId?: unknown;
  heroSliderName?: unknown;
}) {
  if (typeof heroSliderId !== "string" || !heroSliderId) return null;

  const row = await getContentById(heroSliderId);
  if (!row || row.contentType !== "hero_slider" || row.status !== "published") {
    return null;
  }

  const me = await getOptionalCurrentUser(true);
  const viewerRoles = me ? getRoles(me.publicMetadata) : null;
  if (!canViewContent(row.visibility, viewerRoles)) return null;

  return (
    <HeroSliderRenderer
      data={row.contentJson}
      label={typeof heroSliderName === "string" ? heroSliderName : row.title}
    />
  );
}
