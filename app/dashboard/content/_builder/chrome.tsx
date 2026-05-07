"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useEditor } from "@craftjs/core";
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
  Trash2,
  Undo2,
  Redo2,
} from "lucide-react";
import { resolver } from "./blocks/editable";
import { ROOT_NODE_ID } from "./types";

/* ===================== Palette (left rail) ===================== */

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
  { name: "Columns", label: "Columns", icon: <Columns2 className="h-4 w-4" /> },
  { name: "Heading", label: "Heading", icon: <Heading1 className="h-4 w-4" /> },
  { name: "Text", label: "Text", icon: <Type className="h-4 w-4" /> },
  { name: "Image", label: "Image", icon: <ImageIcon className="h-4 w-4" /> },
  { name: "Button", label: "Button", icon: <Square className="h-4 w-4" /> },
  { name: "Hero", label: "Hero", icon: <Sparkles className="h-4 w-4" /> },
  {
    name: "RawHtml",
    label: "Raw HTML",
    icon: <FileCode2 className="h-4 w-4" />,
  },
];

export function BlocksPalette() {
  const { connectors, query, actions } = useEditor();

  function addBlock(name: keyof typeof resolver) {
    const Cmp = resolver[name] as React.ComponentType<Record<string, unknown>>;
    const props = ((resolver[name] as unknown as { craft?: { props?: object } })
      .craft?.props ?? {}) as Record<string, unknown>;
    const tree = query.parseReactElement(<Cmp {...props} />).toNodeTree();
    actions.addNodeTree(tree, ROOT_NODE_ID);
  }

  return (
    <div className="space-y-1">
      {items.map((it) => {
        const Cmp = resolver[it.name] as React.ComponentType<
          Record<string, unknown>
        >;
        const props = ((
          resolver[it.name] as unknown as { craft?: { props?: object } }
        ).craft?.props ?? {}) as Record<string, unknown>;
        return (
          <button
            key={it.name}
            type="button"
            ref={(el) => {
              if (el) connectors.create(el, <Cmp {...props} />);
            }}
            onClick={() => addBlock(it.name)}
            className="flex w-full cursor-grab items-center gap-2 rounded-md border bg-background px-2 py-2 text-left text-sm hover:bg-accent active:cursor-grabbing"
          >
            <span className="text-muted-foreground">{it.icon}</span>
            <span>{it.label}</span>
          </button>
        );
      })}
    </div>
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
  width,
  onWidthChange,
  onToggleSource,
  sourceMode,
}: {
  width: "sm" | "md" | "lg";
  onWidthChange: (w: "sm" | "md" | "lg") => void;
  onToggleSource: () => void;
  sourceMode: boolean;
}) {
  const { canUndo, canRedo, actions, selectedId, isDeletable } = useEditor(
    (state, query) => {
      const id = (Array.from(state.events.selected) as string[])[0];
      return {
        canUndo: query.history.canUndo(),
        canRedo: query.history.canRedo(),
        selectedId: id ?? null,
        isDeletable: id ? query.node(id).isDeletable() : false,
      };
    },
  );

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!canUndo}
        onClick={() => actions.history.undo()}
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!canRedo}
        onClick={() => actions.history.redo()}
      >
        <Redo2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!selectedId || !isDeletable}
        onClick={() => selectedId && actions.delete(selectedId)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <div className="ml-auto flex items-center gap-1">
        <span className="mr-1 text-xs text-muted-foreground">Preview:</span>
        {(["sm", "md", "lg"] as const).map((w) => (
          <Button
            key={w}
            type="button"
            size="sm"
            variant={width === w ? "default" : "outline"}
            onClick={() => onWidthChange(w)}
          >
            {w === "sm" ? "Mobile" : w === "md" ? "Tablet" : "Desktop"}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={sourceMode ? "default" : "outline"}
          onClick={onToggleSource}
          className="ml-2"
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
  cbRef.current = onSerialize;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastJson = "";

    const flush = () => {
      const json = query.serialize();
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
