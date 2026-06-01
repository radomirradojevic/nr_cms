import { HeroSliderRenderer } from "@/components/hero-slider-renderer";
import { collectHeroSliderMenuIds } from "@/lib/hero-slider";
import { getTopMenuTreeForViewer, type TopMenuTreeNode } from "@/data/top-menu";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles } from "@/lib/roles";

type Props = {
  data: unknown;
  label?: string;
  preview?: boolean;
  allowViewportWidth?: boolean;
};

export async function HeroSliderRendererWithMenus({
  data,
  label,
  preview = false,
  allowViewportWidth,
}: Props) {
  const initialMenuTrees = await getInitialMenuTrees(data);
  return (
    <HeroSliderRenderer
      data={data}
      label={label}
      preview={preview}
      allowViewportWidth={allowViewportWidth}
      initialMenuTrees={initialMenuTrees}
    />
  );
}

async function getInitialMenuTrees(data: unknown) {
  const ids = collectHeroSliderMenuIds(data);
  if (ids.length === 0) return {};

  const user = await getOptionalCurrentUser(true);
  const viewerRoles = user ? getRoles(user.publicMetadata) : null;
  const entries = await Promise.all(
    ids.map(async (id) => {
      const tree = await getTopMenuTreeForViewer(id, viewerRoles);
      return [id, tree] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<string, TopMenuTreeNode[]>;
}
