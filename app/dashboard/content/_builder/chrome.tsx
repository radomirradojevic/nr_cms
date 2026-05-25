"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Element, useEditor } from "@craftjs/core";
import dynamic from "next/dynamic";
import type { EditorState } from "@craftjs/core/lib/interfaces/editor";
import type { NodeTree } from "@craftjs/core/lib/interfaces/nodes";
import { Button } from "@/components/ui/button";
import {
  Heading1,
  Type,
  Image as ImageIcon,
  Square,
  Sparkles,
  Columns2,
  LayoutPanelTop,
  FileCode2,
  Images,
  Film,
  FormInput,
  Database,
  Table as TableIcon,
  Trash2,
  Undo2,
  Redo2,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { resolver } from "./blocks/editable";
import { ROOT_NODE_ID, type SerializedNode } from "./types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  getLayoutColumnCount,
  layoutPresets,
  type LayoutKind,
} from "@/app/dashboard/content/_editors/layout-presets";

const LayersPanel = dynamic(() => import("./layers"), { ssr: false });

/* ===================== Palette (left rail) ===================== */

function removeNodeFromState(state: EditorState, nodeId: string) {
  const node = state.nodes[nodeId];
  if (!node) return;

  for (const childId of node.data.nodes ?? []) {
    removeNodeFromState(state, childId);
  }

  for (const linkedNodeId of Object.values(node.data.linkedNodes ?? {})) {
    removeNodeFromState(state, linkedNodeId);
  }

  const parentId = node.data.parent;
  const parent = parentId ? state.nodes[parentId] : null;
  if (parent) {
    parent.data.nodes = (parent.data.nodes ?? []).filter((id) => id !== nodeId);

    for (const [slotId, linkedNodeId] of Object.entries(
      parent.data.linkedNodes ?? {},
    )) {
      if (linkedNodeId === nodeId) delete parent.data.linkedNodes[slotId];
    }
  }

  for (const eventSet of Object.values(state.events)) {
    eventSet.delete(nodeId);
  }

  delete state.nodes[nodeId];
}

function syncLayoutSlotsInState(
  state: EditorState,
  layoutNodeId: string,
  columnCount: number,
  createSlotTree: (index: number) => NodeTree,
) {
  const layoutNode = state.nodes[layoutNodeId];
  if (!layoutNode) return;

  layoutNode.data.linkedNodes ??= {};

  for (let index = 1; index <= columnCount; index += 1) {
    const slotId = `slot-${index}`;
    const existingNodeId = layoutNode.data.linkedNodes[slotId];
    if (existingNodeId && state.nodes[existingNodeId]) continue;

    const slotTree = createSlotTree(index);
    const slotNode = slotTree.nodes[slotTree.rootNodeId];
    if (!slotNode) continue;

    for (const node of Object.values(slotTree.nodes)) {
      state.nodes[node.id] = node;
    }

    slotNode.data.parent = layoutNodeId;
    layoutNode.data.linkedNodes[slotId] = slotTree.rootNodeId;
  }

  for (const [slotId, linkedNodeId] of Object.entries(
    layoutNode.data.linkedNodes ?? {},
  )) {
    const match = /^slot-(\d+)$/.exec(slotId);
    if (!match) continue;

    const slotIndex = Number(match[1]);
    if (slotIndex > columnCount) removeNodeFromState(state, linkedNodeId);
  }
}

const items: Array<{
  name: keyof typeof resolver;
  label: string;
  icon: ReactNode;
}> = [
  {
    name: "Section",
    label: "Section",
    icon: <LayoutPanelTop className="h-4 w-4" />,
  },
  {
    name: "Layout",
    label: "LAYOUT",
    icon: <LayoutPanelTop className="h-4 w-4" />,
  },
  { name: "Columns", label: "Columns", icon: <Columns2 className="h-4 w-4" /> },
  { name: "Heading", label: "Heading", icon: <Heading1 className="h-4 w-4" /> },
  { name: "Text", label: "Text", icon: <Type className="h-4 w-4" /> },
  { name: "Table", label: "Table", icon: <TableIcon className="h-4 w-4" /> },
  { name: "Image", label: "Image", icon: <ImageIcon className="h-4 w-4" /> },
  { name: "Button", label: "Button", icon: <Square className="h-4 w-4" /> },
  { name: "Hero", label: "Hero", icon: <Sparkles className="h-4 w-4" /> },
  {
    name: "RawHtml",
    label: "Raw HTML",
    icon: <FileCode2 className="h-4 w-4" />,
  },
  {
    name: "Gallery",
    label: "Gallery",
    icon: <Images className="h-4 w-4" />,
  },
  {
    name: "Video",
    label: "Video",
    icon: <Film className="h-4 w-4" />,
  },
  {
    name: "Form",
    label: "Form",
    icon: <FormInput className="h-4 w-4" />,
  },
  {
    name: "FormSubmissions",
    label: "Form Submissions",
    icon: <Database className="h-4 w-4" />,
  },
];

export function BlocksPalette({ collapsed = false }: { collapsed?: boolean }) {
  const { connectors, query, actions } = useEditor();
  const [layoutDialogOpen, setLayoutDialogOpen] = useState(false);
  const [pendingLayoutNodeId, setPendingLayoutNodeId] = useState<string | null>(
    null,
  );

  function addBlock(
    name: keyof typeof resolver,
    propsOverride?: Record<string, unknown>,
    parentId = ROOT_NODE_ID,
    index?: number,
  ) {
    const Cmp = resolver[name] as React.ComponentType<Record<string, unknown>>;
    const props = ((resolver[name] as unknown as { craft?: { props?: object } })
      .craft?.props ?? {}) as Record<string, unknown>;
    const tree = query
      .parseReactElement(<Cmp {...props} {...propsOverride} />)
      .toNodeTree();
    actions.addNodeTree(tree, parentId, index);
    return tree.rootNodeId;
  }

  function createLayoutSlotTree(index: number) {
    return query
      .parseReactElement(
        <Element
          id={`slot-${index}`}
          is={resolver.LayoutSlot}
          canvas
          index={index}
        />,
      )
      .toNodeTree();
  }

  function syncLayoutSlots(layoutNodeId: string, preset: LayoutKind) {
    actions.setState((state) => {
      syncLayoutSlotsInState(
        state,
        layoutNodeId,
        getLayoutColumnCount(preset),
        createLayoutSlotTree,
      );
    });
  }

  function insertLayout(preset: LayoutKind) {
    if (pendingLayoutNodeId) {
      actions.setState((state) => {
        const node = state.nodes[pendingLayoutNodeId];
        if (!node) return;

        syncLayoutSlotsInState(
          state,
          pendingLayoutNodeId,
          getLayoutColumnCount(preset),
          createLayoutSlotTree,
        );
        node.data.props.preset = preset;
      });
      setPendingLayoutNodeId(null);
    } else {
      const layoutNodeId = addBlock("Layout", { preset });
      syncLayoutSlots(layoutNodeId, preset);
    }
    setLayoutDialogOpen(false);
  }

  function handleLayoutDialogOpenChange(open: boolean) {
    setLayoutDialogOpen(open);

    if (open || !pendingLayoutNodeId) return;

    actions.setState((state) => {
      removeNodeFromState(state, pendingLayoutNodeId);
    });
    setPendingLayoutNodeId(null);
  }

  function handleLayoutDropped(nodeTree: { rootNodeId: string }) {
    setPendingLayoutNodeId(nodeTree.rootNodeId);
    syncLayoutSlots(nodeTree.rootNodeId, "2-col");
    setLayoutDialogOpen(true);
  }

  return (
    <TooltipProvider>
      <div className="space-y-1">
        {items.map((it) => {
          const Cmp = resolver[it.name] as React.ComponentType<
            Record<string, unknown>
          >;
          const props = ((
            resolver[it.name] as unknown as { craft?: { props?: object } }
          ).craft?.props ?? {}) as Record<string, unknown>;
          const isLayout = it.name === "Layout";
          const blockButton = (
            <Button
              key={it.name}
              type="button"
              variant="outline"
              size={collapsed ? "icon-sm" : "sm"}
              ref={(el) => {
                if (!el) return;
                connectors.create(el, <Cmp {...props} />, {
                  onCreate: isLayout ? handleLayoutDropped : undefined,
                });
              }}
              onClick={() =>
                isLayout ? setLayoutDialogOpen(true) : addBlock(it.name)
              }
              className={cn(
                "w-full cursor-grab justify-start active:cursor-grabbing",
                collapsed && "h-8 justify-center px-0",
              )}
              aria-label={it.label}
            >
              <span className="text-muted-foreground">{it.icon}</span>
              <span
                className={cn(
                  "truncate transition-opacity duration-200",
                  collapsed && "sr-only opacity-0",
                )}
              >
                {it.label}
              </span>
            </Button>
          );

          return collapsed ? (
            <Tooltip key={it.name}>
              <TooltipTrigger asChild>{blockButton}</TooltipTrigger>
              <TooltipContent side="right">{it.label}</TooltipContent>
            </Tooltip>
          ) : (
            blockButton
          );
        })}
      </div>
      <Dialog
        open={layoutDialogOpen}
        onOpenChange={handleLayoutDialogOpenChange}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insert Layout</DialogTitle>
            <DialogDescription>
              Choose a responsive grid layout for this page section.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {layoutPresets.map((option) => (
              <button
                key={option.value}
                type="button"
                className="rounded-md border bg-background p-3 text-left transition hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => insertLayout(option.value)}
              >
                <span className="text-sm font-medium">{option.label}</span>
                <span
                  aria-hidden="true"
                  className="mt-3 grid h-16 gap-2"
                  style={{ gridTemplateColumns: option.tracks }}
                >
                  {Array.from({ length: option.columns }, (_, index) => (
                    <span
                      key={index}
                      className="rounded-sm border border-dashed border-muted-foreground/40 bg-muted/60"
                    />
                  ))}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

export function BlocksSidebar({
  collapsed,
  onCollapsedChange,
}: {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  return (
    <aside
      className={cn(
        "z-20 h-full self-start overflow-hidden border-r bg-background transition-[width] duration-300 ease-out",
        collapsed ? "w-12" : "w-[220px]",
      )}
    >
      <div className="flex h-full max-h-[inherit] flex-col">
        <div className="flex h-11 items-center gap-2 border-b px-2">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => onCollapsedChange(!collapsed)}
            aria-label={
              collapsed ? "Expand blocks sidebar" : "Collapse blocks sidebar"
            }
            title={collapsed ? "Expand blocks" : "Collapse blocks"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
          <h4
            className={cn(
              "text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-opacity duration-200",
              collapsed && "pointer-events-none opacity-0",
            )}
          >
            Add blocks
          </h4>
        </div>
        <div
          className={cn(
            "min-h-0 flex-1 p-2",
            collapsed ? "overflow-hidden px-1" : "overflow-y-auto",
          )}
        >
          <div className={cn("space-y-4", collapsed && "space-y-1")}>
            <BlocksPalette collapsed={collapsed} />
            <div
              className={cn(
                "transition-opacity duration-200",
                collapsed &&
                  "pointer-events-none h-0 overflow-hidden opacity-0",
              )}
            >
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Layers
              </h4>
              <div className="rounded border">
                <LayersPanel />
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ===================== Settings panel (right rail) ===================== */

export function SettingsPanel() {
  const { selected } = useEditor((state, query) => {
    const ids = Array.from(state.events.selected) as string[];
    const id = ids[0];
    if (!id || !state.nodes[id]) return { selected: null };
    const node = state.nodes[id];
    const settings = (
      node.related as { settings?: () => ReactNode } | undefined
    )?.settings;
    return {
      selected: {
        id,
        name: node.data.displayName ?? node.data.name,
        Settings: settings,
        isDeletable: query.node(id).isDeletable(),
      },
    };
  });

  if (!selected) {
    return (
      <p className="p-3 text-xs text-muted-foreground">
        Select a block to edit its properties.
      </p>
    );
  }

  const SettingsComp = selected.Settings;
  return (
    <div className="space-y-3 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {selected.name}
      </p>
      {SettingsComp ? (
        <SettingsComp />
      ) : (
        <p className="text-xs text-muted-foreground">No settings.</p>
      )}
    </div>
  );
}

/* ===================== Toolbar ===================== */

export function Toolbar({
  onToggleSource,
  sourceMode,
  onRemountWithJson,
  focusMode,
  onToggleFocusMode,
}: {
  onToggleSource: () => void;
  sourceMode: boolean;
  /**
   * Triggers a full remount of the Craft.js editor with the provided
   * serialized JSON. Used by the Delete button to bypass Craft's internal
   * mutation path entirely (which crashes on certain tree states).
   */
  onRemountWithJson: (json: string) => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
}) {
  const { canUndo, canRedo, actions, query, selectedId, isDeletable } =
    useEditor((state, query) => {
      const id = (Array.from(state.events.selected) as string[])[0];
      let deletable = false;
      if (id && id !== ROOT_NODE_ID && state.nodes[id]) {
        try {
          deletable = query.node(id).isDeletable();
        } catch {
          deletable = false;
        }
      }
      return {
        canUndo: query.history.canUndo(),
        canRedo: query.history.canRedo(),
        selectedId: id ?? null,
        isDeletable: deletable,
      };
    });

  function handleDelete() {
    if (!selectedId || selectedId === ROOT_NODE_ID) return;
    // Build a sanitized tree from the current serialized snapshot, then ask
    // the parent to remount the entire <Editor> with that JSON. We avoid
    // Craft.js's `actions.delete` / `actions.deserialize` because both
    // paths iterate node arrays internally and crash if any sibling has a
    // dangling child reference.
    let serialized: string;
    try {
      serialized = query.serialize();
    } catch {
      return;
    }
    let tree: Record<string, SerializedNode>;
    try {
      tree = JSON.parse(serialized) as Record<string, SerializedNode>;
    } catch {
      return;
    }
    if (!tree || typeof tree !== "object" || !tree[selectedId]) return;

    const toRemove = new Set<string>();
    const visit = (id: string) => {
      if (!id || toRemove.has(id)) return;
      const n = tree[id];
      if (!n) return;
      toRemove.add(id);
      const children: string[] = Array.isArray(n.nodes) ? n.nodes : [];
      for (const c of children) visit(c);
      const linked: Record<string, string> = n.linkedNodes ?? {};
      for (const c of Object.values(linked)) visit(c);
    };
    visit(selectedId);

    const parentId = tree[selectedId]?.parent;
    if (parentId && tree[parentId]) {
      const parent = tree[parentId];
      if (Array.isArray(parent.nodes)) {
        parent.nodes = parent.nodes.filter((x: string) => x !== selectedId);
      }
      if (parent.linkedNodes && typeof parent.linkedNodes === "object") {
        for (const k of Object.keys(parent.linkedNodes)) {
          if (parent.linkedNodes[k] === selectedId)
            delete parent.linkedNodes[k];
        }
      }
    }

    for (const id of toRemove) delete tree[id];

    // Scrub remaining dangling refs and fix orphan parents.
    for (const id of Object.keys(tree)) {
      const n = tree[id];
      if (!n) continue;
      if (Array.isArray(n.nodes)) {
        n.nodes = n.nodes.filter((cid: string) => !!tree[cid]);
      }
      if (n.linkedNodes && typeof n.linkedNodes === "object") {
        for (const k of Object.keys(n.linkedNodes)) {
          if (!tree[n.linkedNodes[k]]) delete n.linkedNodes[k];
        }
      }
      if (n.parent && n.parent !== null && !tree[n.parent]) {
        n.parent = ROOT_NODE_ID;
      }
    }

    onRemountWithJson(JSON.stringify(tree));
  }

  return (
    <div className="sticky top-[var(--sticky-header-h,0px)] z-30 flex min-h-[var(--builder-toolbar-h,49px)] flex-wrap items-center gap-2 border-b bg-background/95 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!canUndo}
        onClick={() => actions.history.undo()}
        aria-label="Undo"
        title="Undo"
      >
        <Undo2 className="h-4 w-4" />
        <span className="hidden sm:inline">Undo</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!canRedo}
        onClick={() => actions.history.redo()}
        aria-label="Redo"
        title="Redo"
      >
        <Redo2 className="h-4 w-4" />
        <span className="hidden sm:inline">Redo</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!selectedId || !isDeletable}
        onClick={handleDelete}
        aria-label="Delete"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline">Delete</span>
      </Button>
      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant={focusMode ? "default" : "outline"}
          onClick={onToggleFocusMode}
          aria-label={focusMode ? "Exit focus mode" : "Focus mode"}
          title={focusMode ? "Exit focus mode" : "Focus mode"}
        >
          {focusMode ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {focusMode ? "Exit focus" : "Focus"}
          </span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant={sourceMode ? "default" : "outline"}
          onClick={onToggleSource}
          className="ml-2"
          aria-label={sourceMode ? "Visual" : "Source"}
          title={sourceMode ? "Visual" : "Source"}
        >
          {sourceMode ? "Visual" : "Source"}
        </Button>
      </div>
    </div>
  );
}

/* ===================== Change watcher ===================== */

/**
 * Subscribes to the Craft.js store directly (outside the React render phase)
 * and forwards a debounced serialized JSON string to the parent form.
 *
 * Using `store.subscribe` inside `useEffect` (instead of `useEditor` selector)
 * avoids "Cannot update a component while rendering a different component"
 * warnings caused by Craft dispatching node-registration actions during the
 * render of `<Element>` slot children (e.g. inside `Columns`).
 */
export function ChangeWatcher({
  onSerialize,
}: {
  onSerialize: (json: string) => void;
}) {
  const { query, store } = useEditor();
  const cbRef = useRef(onSerialize);

  useEffect(() => {
    cbRef.current = onSerialize;
  }, [onSerialize]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastJson = "";

    // Opt-in perf logging: append `?perf=1` to the URL to log serialize
    // duration, payload size, and store-event frequency. No-op otherwise so
    // production users pay zero cost.
    const perf =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("perf") === "1";
    let eventCount = 0;
    let lastLog = perf ? performance.now() : 0;

    const flush = () => {
      const t0 = perf ? performance.now() : 0;
      const json = query.serialize();
      if (perf) {
        const dt = performance.now() - t0;
        console.log(
          `[page-editor] serialize ${dt.toFixed(1)}ms, size=${json.length}B, events=${eventCount}`,
        );
        eventCount = 0;
        lastLog = performance.now();
      }
      if (json !== lastJson) {
        lastJson = json;
        cbRef.current(json);
      }
    };

    // Initial sync (deferred to next tick so it doesn't fire during render).
    timer = setTimeout(flush, 0);

    const unsubscribe = store.subscribe(
      // Selector: only re-run when nodes actually change.
      (state) => ({ nodes: state.nodes }),
      () => {
        if (perf) {
          eventCount += 1;
          // Throttled "store is busy" log every 1s.
          const now = performance.now();
          if (now - lastLog > 1000) {
            console.log(
              `[page-editor] store busy: ${eventCount} events in last ${(now - lastLog).toFixed(0)}ms`,
            );
            lastLog = now;
          }
        }
        if (timer) clearTimeout(timer);
        timer = setTimeout(flush, 150);
      },
    );

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [query, store]);

  return null;
}
