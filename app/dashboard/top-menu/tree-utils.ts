import type { TopMenuTreeNode } from "@/data/top-menu";

export type FlatItem = {
  id: string;
  label: string;
  url: string;
  contentId: string | null;
  target: "_self" | "_blank";
  parentId: string | null;
  depth: number;
  index: number; // index among siblings
  collapsed?: boolean;
  hasChildren: boolean;
};

export function flattenTree(
  items: TopMenuTreeNode[],
  parentId: string | null = null,
  depth = 0,
  collapsedIds: Set<string> = new Set(),
): FlatItem[] {
  const out: FlatItem[] = [];
  items.forEach((item, index) => {
    const flat: FlatItem = {
      id: item.id,
      label: item.label,
      url: item.url,
      contentId: item.contentId,
      target: item.target,
      parentId,
      depth,
      index,
      hasChildren: item.children.length > 0,
      collapsed: collapsedIds.has(item.id),
    };
    out.push(flat);
    if (!flat.collapsed && item.children.length > 0) {
      out.push(...flattenTree(item.children, item.id, depth + 1, collapsedIds));
    }
  });
  return out;
}

export function findById(
  items: TopMenuTreeNode[],
  id: string,
): TopMenuTreeNode | null {
  for (const it of items) {
    if (it.id === id) return it;
    const c = findById(it.children, id);
    if (c) return c;
  }
  return null;
}

/**
 * Project the depth + parentId of the dragged item when hovered over `overId`.
 * Mirrors the official dnd-kit sortable-tree example.
 */
export function getProjection(
  items: FlatItem[],
  activeId: string,
  overId: string,
  dragOffsetX: number,
  indentationWidth: number,
): { depth: number; parentId: string | null } {
  const overItemIndex = items.findIndex(({ id }) => id === overId);
  const activeItemIndex = items.findIndex(({ id }) => id === activeId);
  if (overItemIndex < 0 || activeItemIndex < 0) {
    return { depth: 0, parentId: null };
  }
  const activeItem = items[activeItemIndex];
  const newItems = arrayMove(items, activeItemIndex, overItemIndex);
  const previousItem = newItems[overItemIndex - 1];
  const nextItem = newItems[overItemIndex + 1];
  const dragDepth = Math.round(dragOffsetX / indentationWidth);
  const projectedDepth = activeItem.depth + dragDepth;
  const maxDepth = previousItem ? previousItem.depth + 1 : 0;
  const minDepth = nextItem ? nextItem.depth : 0;
  let depth = projectedDepth;
  if (depth >= maxDepth) depth = maxDepth;
  else if (depth < minDepth) depth = minDepth;

  function getParentId(): string | null {
    if (depth === 0 || !previousItem) return null;
    if (depth === previousItem.depth) return previousItem.parentId;
    if (depth > previousItem.depth) return previousItem.id;
    const newParent = newItems
      .slice(0, overItemIndex)
      .reverse()
      .find((item) => item.depth === depth)?.parentId;
    return newParent ?? null;
  }

  return { depth, parentId: getParentId() };
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const out = arr.slice();
  out.splice(to, 0, out.splice(from, 1)[0]);
  return out;
}

/**
 * Rebuild a tree from the new flat list with applied projection.
 * Returns flat updates: { id, parentId, order } per item that changed.
 */
export function buildUpdatesFromFlat(
  flatBefore: FlatItem[],
  newOrder: FlatItem[],
): Array<{ id: string; parentId: string | null; order: number }> {
  // Recompute order per parent group based on appearance in newOrder
  const counters = new Map<string | null, number>();
  const result: Array<{ id: string; parentId: string | null; order: number }> =
    [];
  const beforeById = new Map(flatBefore.map((i) => [i.id, i]));
  for (const item of newOrder) {
    const order = counters.get(item.parentId) ?? 0;
    counters.set(item.parentId, order + 1);
    const before = beforeById.get(item.id);
    if (
      !before ||
      before.parentId !== item.parentId ||
      before.index !== order
    ) {
      result.push({ id: item.id, parentId: item.parentId, order });
    }
  }
  return result;
}

/**
 * Apply a projection (newDepth/newParentId) to the active item in `items`,
 * after `arrayMove` has been performed, returning the new flat list.
 */
export function applyProjection(
  flat: FlatItem[],
  activeId: string,
  newParentId: string | null,
  newDepth: number,
): FlatItem[] {
  return flat.map((item) =>
    item.id === activeId
      ? { ...item, parentId: newParentId, depth: newDepth }
      : item,
  );
}

export { arrayMove };
