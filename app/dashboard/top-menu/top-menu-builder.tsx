"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";

import type {
  TopMenuTreeNode,
  ContentPickerItem,
  BlogCategoryPickerItem,
} from "@/data/top-menu";
import {
  applyProjection,
  buildUpdatesFromFlat,
  flattenTree,
  getProjection,
  type FlatItem,
} from "./tree-utils";
import { ContentPicker } from "./content-picker";
import { MenuTreeRow } from "./menu-tree-row";
import { AddItemDialog } from "./add-item-dialog";
import { AddCategoryDialog } from "./add-category-dialog";
import { createMenuItem, reorderMenu } from "./actions";
import { useAdminSectionLock } from "@/components/admin-section-lock-provider";

const INDENT = 24;

type Props = {
  initialTree: TopMenuTreeNode[];
  pickable: ContentPickerItem[];
  categories: BlogCategoryPickerItem[];
};

export function TopMenuBuilder({ initialTree, pickable, categories }: Props) {
  const router = useRouter();
  const lock = useAdminSectionLock();
  const canEdit = lock.isEditor;
  const [tree, setTree] = useState<TopMenuTreeNode[]>(initialTree);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [collapsedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Sync local tree state when server data changes (after refresh / mutations)
  useEffect(() => {
    setTree(initialTree);
  }, [initialTree]);

  const flat: FlatItem[] = useMemo(
    () => flattenTree(tree, null, 0, collapsedIds),
    [tree, collapsedIds],
  );
  const sortedIds = flat.map((f) => f.id);

  // Hide descendants of the actively dragged tree node
  const visibleFlat = useMemo(() => {
    if (!activeId) return flat;
    const activeIndex = flat.findIndex((f) => f.id === activeId);
    if (activeIndex < 0) return flat;
    const activeDepth = flat[activeIndex].depth;
    const out: FlatItem[] = [];
    for (let i = 0; i < flat.length; i++) {
      if (i > activeIndex && flat[i].depth > activeDepth) continue;
      out.push(flat[i]);
    }
    return out;
  }, [flat, activeId]);

  const projected =
    activeId && overId
      ? getProjection(visibleFlat, activeId, overId, offsetX, INDENT)
      : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function refresh() {
    startTransition(() => router.refresh());
  }

  function handleDragStart(e: DragStartEvent) {
    if (!canEdit) return;
    const id = String(e.active.id);
    setActiveId(id);
    setError(null);
  }

  function handleDragMove(e: DragMoveEvent) {
    setOffsetX(e.delta.x);
  }

  function handleDragOver(e: DragOverEvent) {
    setOverId(e.over ? String(e.over.id) : null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    const dropOver = e.over ? String(e.over.id) : null;
    const dropActiveData = e.active.data.current as
      | { kind?: "picker" | "tree"; contentId?: string }
      | undefined;

    setActiveId(null);
    setOverId(null);
    setOffsetX(0);

    if (!canEdit) return;

    // ── Picker → tree: create new content-linked menu item
    if (dropActiveData?.kind === "picker" && dropActiveData.contentId) {
      let parentId: string | null = null;
      if (dropOver && dropOver !== "tree-root") {
        const overItem = flat.find((f) => f.id === dropOver);
        if (overItem) parentId = overItem.parentId;
      }
      const result = await createMenuItem(
        {
          kind: "content",
          contentId: dropActiveData.contentId,
          parentId,
        },
        lock.clientId,
      );
      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        refresh();
      }
      return;
    }

    // ── Tree node reorder
    if (!dropOver || !e.active.id) return;
    const activeIdStr = String(e.active.id);
    if (activeIdStr === dropOver && !projected) return;

    const activeIndex = flat.findIndex((f) => f.id === activeIdStr);
    const overIndex = flat.findIndex((f) => f.id === dropOver);
    if (activeIndex < 0 || overIndex < 0) return;

    const moved = arrayMove(flat, activeIndex, overIndex);
    const withProjection = projected
      ? applyProjection(moved, activeIdStr, projected.parentId, projected.depth)
      : moved;

    const updates = buildUpdatesFromFlat(flat, withProjection);
    if (updates.length === 0) return;

    // Optimistic UI: rebuild tree from flat
    setTree(rebuildTree(withProjection));

    const result = await reorderMenu({ updates }, lock.clientId);
    if ("error" in result && result.error) {
      setError(result.error);
      // rollback
      setTree(initialTree);
      refresh();
    } else {
      refresh();
    }
  }

  return (
    <DndContext
      id="top-menu-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setOverId(null);
        setOffsetX(0);
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">
        <aside className="border rounded-md p-4 bg-card h-fit">
          <h2 className="text-sm font-semibold mb-3">Content</h2>
          <ContentPicker items={pickable} />
        </aside>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Menu structure</h2>
            <div className="flex items-center gap-2">
              <AddCategoryDialog
                parentId={null}
                categories={categories}
                onSuccess={refresh}
                disabled={!canEdit}
                clientId={lock.clientId}
              />
              <AddItemDialog
                parentId={null}
                onSuccess={refresh}
                disabled={!canEdit}
                clientId={lock.clientId}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive border border-destructive/40 bg-destructive/10 rounded p-2">
              {error}
            </p>
          )}

          <SortableContext
            items={sortedIds}
            strategy={verticalListSortingStrategy}
          >
            <ul
              id="tree-root"
              className="border rounded-md bg-card divide-y min-h-[120px]"
            >
              {visibleFlat.length === 0 && (
                <li className="p-6 text-sm text-muted-foreground text-center">
                  No menu items yet. Drag a content item from the left, or click
                  &quot;Add custom link&quot;.
                </li>
              )}
              {visibleFlat.map((item) => {
                const isActive = item.id === activeId;
                const displayDepth =
                  isActive && projected ? projected.depth : item.depth;
                return (
                  <MenuTreeRow
                    key={item.id}
                    item={item}
                    depth={displayDepth}
                    indent={INDENT}
                    onMutated={refresh}
                    disabled={!canEdit}
                    clientId={lock.clientId}
                  />
                );
              })}
            </ul>
          </SortableContext>

          <p className="text-xs text-muted-foreground">
            Drag horizontally while moving an item to nest it under the row
            above. Drag a content item from the left panel onto the menu to
            create a new linked item.
          </p>
        </section>
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="bg-popover text-popover-foreground shadow-lg rounded border px-3 py-2 text-sm">
            {flat.find((f) => f.id === activeId)?.label ?? "Menu item"}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function rebuildTree(flat: FlatItem[]): TopMenuTreeNode[] {
  const byId = new Map<string, TopMenuTreeNode>();
  for (const f of flat) {
    byId.set(f.id, {
      id: f.id,
      label: f.label,
      url: f.url,
      parentId: f.parentId,
      order: 0,
      contentId: f.contentId,
      categoryId: f.categoryId,
      target: f.target,
      children: [],
    });
  }
  const roots: TopMenuTreeNode[] = [];
  // Track running order per parent
  const counters = new Map<string | null, number>();
  for (const f of flat) {
    const node = byId.get(f.id)!;
    const order = counters.get(f.parentId) ?? 0;
    node.order = order;
    counters.set(f.parentId, order + 1);
    if (f.parentId && byId.has(f.parentId)) {
      byId.get(f.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
