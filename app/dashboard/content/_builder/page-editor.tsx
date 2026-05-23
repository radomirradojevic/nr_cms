"use client";

import { useMemo, useRef, useState } from "react";
import { Editor, Frame, Element, useEditor } from "@craftjs/core";
import dynamic from "next/dynamic";
import { resolver, Root } from "./blocks/editable";
import { renderTree } from "./server-render";
import { BlocksPalette, ChangeWatcher, SettingsPanel, Toolbar } from "./chrome";
import { HtmlSourceEditor } from "./source-view";
import {
  ROOT_NODE_ID,
  emptyBuilderData,
  isBuilderData,
  type BuilderData,
} from "./types";
import {
  cssVarsToInlineStyle,
  resolveAppearance,
  type AppearanceSettings,
} from "@/lib/appearance";
import {
  ViewportProvider,
  type Viewport,
} from "./blocks/panel/viewport-context";
import { Button } from "@/components/ui/button";
import { Monitor, Tablet, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const LayersPanel = dynamic(() => import("./layers"), { ssr: false });

type Props = {
  /**
   * Either a BuilderData envelope or any unknown JSON. Anything that isn't
   * a recognised envelope starts the editor with an empty document.
   *
   * IMPORTANT: This value is read **once** on mount. Subsequent changes to
   * the prop reference are ignored — the editor is intentionally uncontrolled
   * so that drag/drop and inline edits do not trigger parent re-renders.
   * Read the latest value via the `valueRef` callback.
   */
  defaultValue: unknown;
  /**
   * Called once on mount with a getter that always returns the latest
   * `BuilderData` from the editor. The parent should hold this in a ref
   * and call it at submit time. Avoids a full form re-render per keystroke.
   */
  registerGetValue?: (getValue: () => BuilderData) => void;
  /**
   * Optional debounced change notifier. Fires after each (debounced) edit.
   * Prefer `registerGetValue` for save/submit flows — using `onChange` to
   * `setState` in the parent will reintroduce the per-edit re-render storm.
   */
  onChange?: (value: BuilderData) => void;
  /**
   * Frontend appearance settings (theme/fonts/radius/shadow/contentWidth).
   * Applied to the editor preview frame so the canvas mirrors the public
   * site exactly. Optional — defaults are used when not provided.
   */
  appearance?: AppearanceSettings;
};

const desktopPreviewWidthClass = "max-w-5xl";

export function PageEditor({
  defaultValue,
  registerGetValue,
  onChange,
  appearance,
}: Props) {
  // Frame only reads `data` once on mount — derive a stable initial JSON.
  // Computed exactly once; subsequent prop changes are intentionally ignored.
  const initialJsonFromValue = useMemo(() => {
    if (isBuilderData(defaultValue)) return JSON.stringify(defaultValue.nodes);
    return JSON.stringify(emptyBuilderData.nodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The current canonical JSON used to (re)mount the editor. Updated by
  // delete operations that rebuild the tree externally and request a full
  // remount.
  const [editorJson, setEditorJson] = useState(initialJsonFromValue);
  const [remountKey, setRemountKey] = useState(0);

  // Latest serialized nodes pushed by ChangeWatcher. The parent reads via
  // the registered getter at submit time — never causes a re-render here.
  const latestNodesRef = useRef<BuilderData["nodes"]>(
    (() => {
      try {
        return JSON.parse(initialJsonFromValue) as BuilderData["nodes"];
      } catch {
        return emptyBuilderData.nodes;
      }
    })(),
  );

  // Register the getter exactly once on mount.
  const registerRef = useRef(registerGetValue);
  registerRef.current = registerGetValue;
  useMemo(() => {
    registerRef.current?.(() => ({
      version: 1,
      nodes: latestNodesRef.current,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRemountWithJson(json: string) {
    setEditorJson(json);
    setRemountKey((k) => k + 1);
    try {
      const nodes = JSON.parse(json) as BuilderData["nodes"];
      latestNodesRef.current = nodes;
      onChange?.({ version: 1, nodes });
    } catch {
      /* ignore */
    }
  }

  function handleLatestNodes(nodes: BuilderData["nodes"]) {
    latestNodesRef.current = nodes;
    onChange?.({ version: 1, nodes });
  }

  return (
    <div className="rounded-md border">
      <Editor key={remountKey} resolver={resolver}>
        <Inner
          initialJson={editorJson}
          onLatestNodes={handleLatestNodes}
          onLatestJson={setEditorJson}
          onRemountWithJson={handleRemountWithJson}
          appearance={appearance}
        />
      </Editor>
    </div>
  );
}

function Inner({
  initialJson,
  onLatestNodes,
  onLatestJson,
  onRemountWithJson,
  appearance,
}: {
  initialJson: string;
  onLatestNodes: (nodes: BuilderData["nodes"]) => void;
  onLatestJson: (json: string) => void;
  onRemountWithJson: (json: string) => void;
  appearance?: AppearanceSettings;
}) {
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState("");
  const { actions, query } = useEditor();

  const resolvedAppearance = useMemo(
    () => resolveAppearance(appearance),
    [appearance],
  );
  const previewStyle = useMemo(
    () => cssVarsToInlineStyle(resolvedAppearance.cssVars),
    [resolvedAppearance],
  );

  function handleSerialize(json: string) {
    onLatestJson(json);
    try {
      const nodes = JSON.parse(json) as BuilderData["nodes"];
      onLatestNodes(nodes);
    } catch {
      /* ignore */
    }
  }

  async function enterSourceMode() {
    try {
      const nodes = JSON.parse(query.serialize()) as BuilderData["nodes"];
      // `react-dom/server` is ~50 KB and only needed for Source view —
      // load on demand to keep it out of the editor's initial chunk.
      const { renderToStaticMarkup } = await import("react-dom/server");
      const html = renderToStaticMarkup(
        renderTree({ version: 1, nodes }) as React.ReactElement,
      );
      setSourceHtml(html);
    } catch {
      setSourceHtml("");
    }
    setSourceMode(true);
  }

  function exitSourceMode() {
    if (
      !window.confirm(
        "Exit source view? The page will be replaced with a single Raw HTML block. " +
          "The original block structure cannot be restored automatically.",
      )
    ) {
      return;
    }
    const newNodes: BuilderData["nodes"] = {
      [ROOT_NODE_ID]: {
        type: { resolvedName: "Root" },
        isCanvas: true,
        props: {},
        displayName: "Root",
        custom: {},
        parent: null,
        hidden: false,
        nodes: ["raw"],
        linkedNodes: {},
      },
      raw: {
        type: { resolvedName: "RawHtml" },
        isCanvas: false,
        props: { html: sourceHtml },
        displayName: "RawHtml",
        custom: {},
        parent: ROOT_NODE_ID,
        hidden: false,
        nodes: [],
        linkedNodes: {},
      },
    };
    actions.deserialize(JSON.stringify(newNodes));
    onLatestNodes(newNodes);
    setSourceMode(false);
  }

  // Hard cap of the preview canvas width when emulating a viewport.
  const viewportMaxWidth: Record<Viewport, string | undefined> = {
    desktop: undefined,
    tablet: "768px",
    mobile: "390px",
  };

  return (
    <ViewportProvider value={viewport}>
      <Toolbar
        sourceMode={sourceMode}
        onToggleSource={sourceMode ? exitSourceMode : enterSourceMode}
        onRemountWithJson={onRemountWithJson}
      />

      {sourceMode ? (
        <div className="p-3">
          <HtmlSourceEditor value={sourceHtml} onChange={setSourceHtml} />
          <p className="mt-2 text-xs text-muted-foreground">
            Edit raw HTML and click <strong>Visual</strong> to commit. The page
            will be replaced with one Raw HTML block.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[200px_1fr_280px]">
          <aside className="sticky top-[calc(var(--sticky-header-h,0px)+0.75rem)] max-h-[calc(100dvh-var(--sticky-header-h,0px)-1.5rem)] self-start overflow-y-auto border-r p-3">
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Add blocks
                </h4>
                <BlocksPalette />
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Layers
                </h4>
                <div className="rounded border">
                  <LayersPanel />
                </div>
              </div>
            </div>
          </aside>

          <main className="overflow-auto bg-muted/20 p-6">
            <div className="mb-3 flex items-center justify-center gap-1">
              <Button
                type="button"
                size="sm"
                variant={viewport === "desktop" ? "default" : "outline"}
                onClick={() => setViewport("desktop")}
              >
                <Monitor className="h-4 w-4" />
                Desktop
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewport === "tablet" ? "default" : "outline"}
                onClick={() => setViewport("tablet")}
              >
                <Tablet className="h-4 w-4" />
                Tablet
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewport === "mobile" ? "default" : "outline"}
                onClick={() => setViewport("mobile")}
              >
                <Smartphone className="h-4 w-4" />
                Mobile
              </Button>
            </div>
            <div
              className={cn(
                "mx-auto rounded-md bg-background shadow transition-[max-width]",
                viewport === "desktop" ? desktopPreviewWidthClass : null,
                resolvedAppearance.htmlClass,
              )}
              style={{
                ...previewStyle,
                ...(viewport !== "desktop"
                  ? { maxWidth: viewportMaxWidth[viewport] }
                  : null),
              }}
            >
              <Frame data={initialJson}>
                <Element is={Root} canvas />
              </Frame>
            </div>
          </main>

          <aside className="sticky top-[calc(var(--sticky-header-h,0px)+0.75rem)] max-h-[calc(100dvh-var(--sticky-header-h,0px)-1.5rem)] self-start overflow-y-auto border-l">
            <SettingsPanel />
          </aside>
        </div>
      )}

      <ChangeWatcher onSerialize={handleSerialize} />
    </ViewportProvider>
  );
}
