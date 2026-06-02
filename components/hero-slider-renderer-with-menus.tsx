import { HeroSliderRenderer } from "@/components/hero-slider-renderer";
import { collectHeroSliderMenuIds } from "@/lib/hero-slider";
import { getTopMenuTreeForViewer, type TopMenuTreeNode } from "@/data/top-menu";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole, type Role } from "@/lib/roles";

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
  const user = await getOptionalCurrentUser(true);
  const viewerRoles = user ? getRoles(user.publicMetadata) : null;
  const isBackendUser =
    !!viewerRoles &&
    (hasRole(viewerRoles, "admin") ||
      hasRole(viewerRoles, "publisher") ||
      hasRole(viewerRoles, "author"));
  const isAdmin = !!viewerRoles && hasRole(viewerRoles, "admin");
  const initialMenuTrees = await getInitialMenuTrees(data, viewerRoles);
  return (
    <HeroSliderRenderer
      data={data}
      label={label}
      preview={preview}
      allowViewportWidth={allowViewportWidth}
      initialMenuTrees={initialMenuTrees}
      fallbackIsBackendUser={isBackendUser}
      fallbackIsAdmin={isAdmin}
    />
  );
}

async function getInitialMenuTrees(data: unknown, viewerRoles: Role[] | null) {
  const ids = collectHeroSliderMenuIds(data);
  if (ids.length === 0) return {};

  const entries = await Promise.all(
    ids.map(async (id) => {
      const tree = await getTopMenuTreeForViewer(id, viewerRoles);
      return [id, tree] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<string, TopMenuTreeNode[]>;
}
