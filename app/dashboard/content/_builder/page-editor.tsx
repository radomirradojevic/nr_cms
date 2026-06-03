"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Editor, Frame, Element, useEditor } from "@craftjs/core";
import { resolver, Root } from "./blocks/editable";
import { renderTree } from "./server-render";
import { BlocksSidebar, ChangeWatcher, SettingsPanel, Toolbar } from "./chrome";
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
import {
  Eye,
  FolderTree,
  Monitor,
  PanelRightClose,
  PanelRightOpen,
  Rocket,
  Search,
  Settings2,
  Smartphone,
  Tablet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { sanitizeCmsHtml } from "@/lib/content-sanitizer";
import type { AIProviderId, AiProviderOption } from "@/lib/global-settings";

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
  settingsPanels?: PageEditorSettingsPanels;
  pageTitle?: string;
  aiAssistantAvailable?: boolean;
  aiAssistantActive?: boolean;
  onAiAssistantActiveChange?: (active: boolean) => void;
  onAiSeoGenerated?: (seo: {
    metaTitle?: string;
    metaDescription?: string;
  }) => void;
  aiProviderOptions?: AiProviderOption[];
  aiProviderId?: AIProviderId;
  onAiProviderIdChange?: (providerId: AIProviderId) => void;
  aiModelId?: string;
  onAiModelIdChange?: (modelId: string) => void;
};

export type PageEditorSettingsTab =
  | "properties"
  | "publishing"
  | "visibility"
  | "category"
  | "seo";

export type PageEditorSettingsPanels = Partial<
  Record<Exclude<PageEditorSettingsTab, "properties">, ReactNode>
>;

const desktopPreviewWidthClass = "w-full";

export function PageEditor({
  defaultValue,
  registerGetValue,
  onChange,
  appearance,
  settingsPanels,
  pageTitle,
  aiAssistantAvailable = false,
  aiAssistantActive = false,
  onAiAssistantActiveChange,
  onAiSeoGenerated,
  aiProviderOptions = [],
  aiProviderId,
  onAiProviderIdChange,
  aiModelId,
  onAiModelIdChange,
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

  // Register a getter that always reads the latest serialized nodes.
  useEffect(() => {
    registerGetValue?.(() => ({
      version: 1,
      nodes: latestNodesRef.current,
    }));
  }, [registerGetValue]);

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
    <div
      className="rounded-md border"
      style={{ "--builder-toolbar-h": "49px" } as React.CSSProperties}
    >
      <Editor key={remountKey} resolver={resolver}>
        <Inner
          initialJson={editorJson}
          onLatestNodes={handleLatestNodes}
          onLatestJson={setEditorJson}
          onRemountWithJson={handleRemountWithJson}
          appearance={appearance}
          settingsPanels={settingsPanels}
          pageTitle={pageTitle}
          aiAssistantAvailable={aiAssistantAvailable}
          aiAssistantActive={aiAssistantActive}
          onAiAssistantActiveChange={onAiAssistantActiveChange}
          onAiSeoGenerated={onAiSeoGenerated}
          aiProviderOptions={aiProviderOptions}
          aiProviderId={aiProviderId}
          onAiProviderIdChange={onAiProviderIdChange}
          aiModelId={aiModelId}
          onAiModelIdChange={onAiModelIdChange}
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
  settingsPanels,
  pageTitle,
  aiAssistantAvailable,
  aiAssistantActive,
  onAiAssistantActiveChange,
  onAiSeoGenerated,
  aiProviderOptions,
  aiProviderId,
  onAiProviderIdChange,
  aiModelId,
  onAiModelIdChange,
}: {
  initialJson: string;
  onLatestNodes: (nodes: BuilderData["nodes"]) => void;
  onLatestJson: (json: string) => void;
  onRemountWithJson: (json: string) => void;
  appearance?: AppearanceSettings;
  settingsPanels?: PageEditorSettingsPanels;
  pageTitle?: string;
  aiAssistantAvailable: boolean;
  aiAssistantActive: boolean;
  onAiAssistantActiveChange?: (active: boolean) => void;
  onAiSeoGenerated?: (seo: {
    metaTitle?: string;
    metaDescription?: string;
  }) => void;
  aiProviderOptions: AiProviderOption[];
  aiProviderId?: AIProviderId;
  onAiProviderIdChange?: (providerId: AIProviderId) => void;
  aiModelId?: string;
  onAiModelIdChange?: (modelId: string) => void;
}) {
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState("");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] =
    useState<PageEditorSettingsTab>("properties");
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
    const sanitizedSourceHtml = sanitizeCmsHtml(sourceHtml);
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
        props: { html: sanitizedSourceHtml },
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
        focusMode={focusMode}
        onToggleFocusMode={() => setFocusMode((v) => !v)}
        aiAssistantAvailable={aiAssistantAvailable}
        aiAssistantActive={aiAssistantActive}
        onAiAssistantActiveChange={onAiAssistantActiveChange}
        onAiSeoGenerated={onAiSeoGenerated}
        aiProviderOptions={aiProviderOptions}
        aiProviderId={aiProviderId}
        onAiProviderIdChange={onAiProviderIdChange}
        aiModelId={aiModelId}
        onAiModelIdChange={onAiModelIdChange}
        pageTitle={pageTitle}
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
        <div className="flex min-h-[calc(100dvh-var(--sticky-header-h,0px)-var(--builder-toolbar-h,49px)-2px)] items-start overflow-visible">
          <div
            className={cn(
              "sticky top-[calc(var(--sticky-header-h,0px)+var(--builder-toolbar-h,49px))] h-[calc(100dvh-var(--sticky-header-h,0px)-var(--builder-toolbar-h,49px)-2px)] shrink-0 transition-[width,opacity] duration-300 ease-out",
              focusMode && "pointer-events-none w-0 opacity-0",
            )}
            aria-hidden={focusMode}
          >
            <BlocksSidebar
              collapsed={leftCollapsed}
              onCollapsedChange={setLeftCollapsed}
            />
          </div>

          <main className="min-w-0 flex-1 bg-muted/20 p-4">
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

          <div
            className={cn(
              "sticky top-[calc(var(--sticky-header-h,0px)+var(--builder-toolbar-h,49px))] h-[calc(100dvh-var(--sticky-header-h,0px)-var(--builder-toolbar-h,49px)-2px)] shrink-0 transition-[width,opacity] duration-300 ease-out",
              focusMode && "pointer-events-none w-0 opacity-0",
            )}
            aria-hidden={focusMode}
          >
            <RightEditorSidebar
              activeTab={activeSettingsTab}
              onActiveTabChange={setActiveSettingsTab}
              collapsed={rightCollapsed}
              onCollapsedChange={setRightCollapsed}
              settingsPanels={settingsPanels}
            />
          </div>
        </div>
      )}

      <ChangeWatcher onSerialize={handleSerialize} />
    </ViewportProvider>
  );
}

function RightEditorSidebar({
  activeTab,
  onActiveTabChange,
  collapsed,
  onCollapsedChange,
  settingsPanels,
}: {
  activeTab: PageEditorSettingsTab;
  onActiveTabChange: (tab: PageEditorSettingsTab) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  settingsPanels?: PageEditorSettingsPanels;
}) {
  const { selectedId } = useEditor((state) => {
    return {
      selectedId: (Array.from(state.events.selected) as string[])[0] ?? null,
    };
  });
  const previousSelectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedId || previousSelectedIdRef.current === selectedId) return;

    previousSelectedIdRef.current = selectedId;
    onActiveTabChange("properties");
    if (collapsed) onCollapsedChange(false);
  }, [collapsed, onActiveTabChange, onCollapsedChange, selectedId]);

  const tabs: Array<{
    value: PageEditorSettingsTab;
    label: string;
    icon: ReactNode;
    content: ReactNode;
  }> = [
    {
      value: "properties",
      label: "Properties",
      icon: <Settings2 className="h-4 w-4" />,
      content: <SettingsPanel />,
    },
    {
      value: "publishing",
      label: "Publishing",
      icon: <Rocket className="h-4 w-4" />,
      content: settingsPanels?.publishing,
    },
    {
      value: "visibility",
      label: "Visibility",
      icon: <Eye className="h-4 w-4" />,
      content: settingsPanels?.visibility,
    },
    {
      value: "category",
      label: "Category",
      icon: <FolderTree className="h-4 w-4" />,
      content: settingsPanels?.category,
    },
    {
      value: "seo",
      label: "SEO",
      icon: <Search className="h-4 w-4" />,
      content: settingsPanels?.seo,
    },
  ];

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "z-20 h-full self-start overflow-hidden border-l bg-background transition-[width] duration-300 ease-out",
          collapsed ? "w-12" : "w-[380px]",
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
                collapsed
                  ? "Expand settings sidebar"
                  : "Collapse settings sidebar"
              }
              title={collapsed ? "Expand settings" : "Collapse settings"}
            >
              {collapsed ? (
                <PanelRightOpen className="h-4 w-4" />
              ) : (
                <PanelRightClose className="h-4 w-4" />
              )}
            </Button>
            <span
              className={cn(
                "text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-opacity duration-200",
                collapsed && "pointer-events-none opacity-0",
              )}
            >
              Inspector
            </span>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              onActiveTabChange(value as PageEditorSettingsTab)
            }
            orientation={collapsed ? "vertical" : "horizontal"}
            className="min-h-0 flex-1 gap-0"
          >
            <TabsList
              className={cn(
                "m-2 h-auto w-auto shrink-0 justify-start overflow-hidden",
                collapsed
                  ? "grid grid-cols-1 gap-1 bg-transparent p-0"
                  : "grid grid-cols-3 gap-1 rounded-md p-1",
              )}
            >
              {tabs.map((tab) => {
                const trigger = (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      "min-w-0 px-2 text-xs",
                      collapsed && "h-8 px-0",
                    )}
                    aria-label={tab.label}
                  >
                    {tab.icon}
                    <span className={cn(collapsed && "sr-only")}>
                      {tab.label}
                    </span>
                  </TabsTrigger>
                );

                return collapsed ? (
                  <Tooltip key={tab.value}>
                    <TooltipTrigger asChild>{trigger}</TooltipTrigger>
                    <TooltipContent side="left">{tab.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  trigger
                );
              })}
            </TabsList>

            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto transition-opacity duration-200",
                collapsed && "pointer-events-none opacity-0",
              )}
            >
              {tabs.map((tab) => (
                <TabsContent key={tab.value} value={tab.value} className="m-0">
                  {tab.content ?? (
                    <p className="p-3 text-xs text-muted-foreground">
                      No settings available.
                    </p>
                  )}
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>
      </aside>
    </TooltipProvider>
  );
}
