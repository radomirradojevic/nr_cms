"use client";

import { useMemo, useState } from "react";
import { Editor, Frame, Element, useEditor } from "@craftjs/core";
import dynamic from "next/dynamic";
import { renderToStaticMarkup } from "react-dom/server";
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

const LayersPanel = dynamic(() => import("./layers"), { ssr: false });

type Props = {
  /**
   * Either a BuilderData envelope or any unknown JSON. Anything that isn't
   * a recognised envelope starts the editor with an empty document.
   */
  value: unknown;
  /** Called with the current envelope on every (debounced) change. */
  onChange: (value: BuilderData) => void;
};

const widthClass = {
  sm: "max-w-sm",
  md: "max-w-2xl",
  lg: "max-w-5xl",
} as const;

export function PageEditor({ value, onChange }: Props) {
  // Frame only reads `data` once on mount — derive a stable initial JSON.
  const initialJsonFromValue = useMemo(() => {
    if (isBuilderData(value)) return JSON.stringify(value.nodes);
    return JSON.stringify(emptyBuilderData.nodes);
  }, [value]);

  // The current canonical JSON used to (re)mount the editor. Updated by
  // delete operations that rebuild the tree externally and request a full
  // remount.
  const [editorJson, setEditorJson] = useState(initialJsonFromValue);
  const [remountKey, setRemountKey] = useState(0);

  function handleRemountWithJson(json: string) {
    setEditorJson(json);
    setRemountKey((k) => k + 1);
    try {
      const nodes = JSON.parse(json) as BuilderData["nodes"];
      onChange({ version: 1, nodes });
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <Editor key={remountKey} resolver={resolver}>
        <Inner
          initialJson={editorJson}
          onChange={onChange}
          onLatestJson={setEditorJson}
          onRemountWithJson={handleRemountWithJson}
        />
      </Editor>
    </div>
  );
}

function Inner({
  initialJson,
  onChange,
  onLatestJson,
  onRemountWithJson,
}: {
  initialJson: string;
  onChange: (value: BuilderData) => void;
  onLatestJson: (json: string) => void;
  onRemountWithJson: (json: string) => void;
}) {
  const [width, setWidth] = useState<"sm" | "md" | "lg">("lg");
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState("");
  const { actions, query } = useEditor();

  function handleSerialize(json: string) {
    onLatestJson(json);
    try {
      const nodes = JSON.parse(json) as BuilderData["nodes"];
      onChange({ version: 1, nodes });
    } catch {
      /* ignore */
    }
  }

  function enterSourceMode() {
    try {
      const nodes = JSON.parse(query.serialize()) as BuilderData["nodes"];
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
    onChange({ version: 1, nodes: newNodes });
    setSourceMode(false);
  }

  return (
    <>
      <Toolbar
        width={width}
        onWidthChange={setWidth}
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
          <aside className="space-y-4 border-r p-3">
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
          </aside>

          <main className="overflow-auto bg-muted/20 p-6">
            <div
              className={`mx-auto ${widthClass[width]} rounded-md bg-background shadow`}
            >
              <Frame data={initialJson}>
                <Element is={Root} canvas />
              </Frame>
            </div>
          </main>

          <aside className="border-l">
            <SettingsPanel />
          </aside>
        </div>
      )}

      <ChangeWatcher onSerialize={handleSerialize} />
    </>
  );
}
