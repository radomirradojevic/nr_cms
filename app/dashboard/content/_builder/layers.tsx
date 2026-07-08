"use client";

import { useEditor } from "@craftjs/core";
import { Layers, useLayer } from "@craftjs/layers";
import { ChevronDown, Eye, EyeOff, Link2 } from "lucide-react";
import type { ReactNode } from "react";

import { useSourceTranslations } from "@/components/source-translations";
import { cn } from "@/lib/utils";

export default function LayersPanel() {
  return <Layers expandRootOnLoad renderLayer={TranslatedLayer} />;
}

function TranslatedLayer({ children }: { children?: ReactNode }) {
  const t = useSourceTranslations();
  const {
    id,
    depth,
    expanded,
    connectors: { drag, layer, layerHeader },
    actions: { toggleLayer },
  } = useLayer((layerState) => ({
    expanded: layerState.expanded,
  }));
  const { displayName, hidden, selected, topLevel, actions } = useEditor(
    (state, query) => {
      const node = state.nodes[id];

      return {
        displayName:
          node?.data.custom.displayName || node?.data.displayName || id,
        hidden: node?.data.hidden ?? false,
        selected: query.getEvent("selected").first() === id,
        topLevel: query.node(id).isTopLevelCanvas(),
      };
    },
  );
  const hasChildren = Boolean(children);

  return (
    <div
      ref={(element) => {
        if (!element) return;
        layer(element);
        drag(element);
      }}
      className={cn(
        "rounded-sm text-xs transition-colors",
        selected && "bg-accent text-accent-foreground",
        !selected && "hover:bg-accent/50",
      )}
    >
      <div
        ref={(element) => {
          if (element) layerHeader(element);
        }}
        className="flex min-w-0 items-center gap-1 px-2 py-1.5"
        style={{ paddingLeft: 8 + depth * 10 }}
      >
        <button
          type="button"
          className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-background/60"
          aria-label={hidden ? t("Show layer") : t("Hide layer")}
          title={hidden ? t("Show layer") : t("Hide layer")}
          onClick={(event) => {
            event.stopPropagation();
            actions.setHidden(id, !hidden);
          }}
        >
          {hidden ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
        </button>
        {topLevel ? (
          <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : null}
        <span className="min-w-0 flex-1 truncate font-medium">
          {t(displayName)}
        </span>
        {hasChildren ? (
          <button
            type="button"
            className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-background/60"
            aria-label={expanded ? t("Collapse layer") : t("Expand layer")}
            title={expanded ? t("Collapse layer") : t("Expand layer")}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleLayer();
            }}
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                !expanded && "-rotate-90",
              )}
            />
          </button>
        ) : null}
      </div>
      {children ? (
        <div className="ml-3 border-l border-border/60 pl-1">{children}</div>
      ) : null}
    </div>
  );
}
