"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Element, useEditor } from "@craftjs/core";
import dynamic from "next/dynamic";
import type { EditorState } from "@craftjs/core/lib/interfaces/editor";
import type { NodeTree } from "@craftjs/core/lib/interfaces/nodes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  Loader2,
  TriangleAlert,
  Wand2,
} from "lucide-react";
import { resolver } from "./blocks/editable";
import {
  ROOT_NODE_ID,
  emptyBuilderData,
  isBuilderData,
  type BuilderData,
  type SerializedNode,
} from "./types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { toast } from "sonner";
import { useSourceTranslations } from "@/components/source-translations";
import type { AIProviderId, AiProviderOption } from "@/lib/global-settings";
import { getAiProviderModelCostWarning } from "@/lib/ai-model-cost-warnings";
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
    name: "HeroSlider",
    label: "Hero Slider",
    icon: <Images className="h-4 w-4" />,
  },
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
  const t = useSourceTranslations();
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
              aria-label={t(it.label)}
            >
              <span className="text-muted-foreground">{it.icon}</span>
              <span
                className={cn(
                  "truncate transition-opacity duration-200",
                  collapsed && "sr-only opacity-0",
                )}
              >
                {t(it.label)}
              </span>
            </Button>
          );

          return collapsed ? (
            <Tooltip key={it.name}>
              <TooltipTrigger asChild>{blockButton}</TooltipTrigger>
              <TooltipContent side="right">{t(it.label)}</TooltipContent>
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
            <DialogTitle>{t("Insert Layout")}</DialogTitle>
            <DialogDescription>
              {t("Choose a responsive grid layout for this page section.")}
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
                <span className="text-sm font-medium">{t(option.label)}</span>
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
  const t = useSourceTranslations();

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
              collapsed
                ? t("Expand blocks sidebar")
                : t("Collapse blocks sidebar")
            }
            title={collapsed ? t("Expand blocks") : t("Collapse blocks")}
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
            {t("Add blocks")}
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
                {t("Layers")}
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
  const t = useSourceTranslations();
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
        {t("Select a block to edit its properties.")}
      </p>
    );
  }

  const SettingsComp = selected.Settings;
  return (
    <div className="space-y-3 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t(selected.name)}
      </p>
      {SettingsComp ? (
        <SettingsComp />
      ) : (
        <p className="text-xs text-muted-foreground">{t("No settings.")}</p>
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
  aiAssistantAvailable = false,
  aiAssistantActive = false,
  onAiAssistantActiveChange,
  onAiSeoGenerated,
  aiProviderOptions = [],
  aiProviderId,
  onAiProviderIdChange,
  aiModelId,
  onAiModelIdChange,
  pageTitle,
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
  pageTitle?: string;
}) {
  const t = useSourceTranslations();
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

  const effectiveAiProviderId = aiProviderOptions.some(
    (provider) => provider.id === aiProviderId,
  )
    ? aiProviderId
    : aiProviderOptions[0]?.id;
  const selectedAiProvider = aiProviderOptions.find(
    (provider) => provider.id === effectiveAiProviderId,
  );
  const selectedAiProviderLabel = selectedAiProvider?.label ?? t("Provider");
  const effectiveAiModelId = selectedAiProvider?.models.some(
    (model) => model.id === aiModelId,
  )
    ? aiModelId
    : (selectedAiProvider?.defaultModel ??
      selectedAiProvider?.models[0]?.id ??
      "");
  const selectedAiModelLabel =
    selectedAiProvider?.models.find((model) => model.id === effectiveAiModelId)
      ?.label ??
    effectiveAiModelId ??
    t("Model");
  const selectedAiModelCostWarning = getAiProviderModelCostWarning(
    effectiveAiProviderId,
    effectiveAiModelId,
  );
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiInsertMode, setAiInsertMode] = useState<"replace" | "append">(
    "replace",
  );
  const [aiGenerating, setAiGenerating] = useState(false);

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

  async function handleGeneratePage() {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      toast.error(t("Enter a prompt first."));
      return;
    }
    if (!effectiveAiProviderId) {
      toast.error(t("Choose an AI provider first."));
      return;
    }
    if (!effectiveAiModelId) {
      toast.error(t("Choose an AI model first."));
      return;
    }

    if (aiInsertMode === "replace" && hasCurrentRootChildren(query)) {
      const confirmed = window.confirm(
        t("Replace the current page content with the AI-generated page?"),
      );
      if (!confirmed) return;
    }

    if (selectedAiModelCostWarning) {
      const confirmed = window.confirm(
        [
          `${t(
            selectedAiModelCostWarning.tone === "danger"
              ? "VERY HIGH COST WARNING"
              : "Cost warning",
          )}: ${selectedAiProviderLabel} ${selectedAiModelLabel}`,
          "",
          t(selectedAiModelCostWarning.text),
          t(
            "Page builder generation uses a separate larger JSON budget of about 2,800-4,000 output tokens.",
          ),
          "",
          t(
            "Continue only if you accept the possible API cost for this request/model.",
          ),
        ].join("\n"),
      );
      if (!confirmed) return;
    }

    setAiGenerating(true);
    try {
      const existingContent =
        aiInsertMode === "append" ? builderNodesToPlainText(query) : "";
      const response = await fetch("/api/ai-page-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: effectiveAiProviderId,
          model: effectiveAiModelId,
          mode: aiInsertMode,
          prompt,
          title: pageTitle?.trim() ?? "",
          existingContent,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        builderData?: unknown;
        seo?: unknown;
        error?: unknown;
      } | null;

      if (!response.ok) {
        toast.error(
          typeof data?.error === "string"
            ? data.error
            : t("AI page generation failed."),
        );
        return;
      }

      if (!isBuilderData(data?.builderData)) {
        toast.error(t("AI did not return usable page blocks."));
        return;
      }

      const nextNodes =
        aiInsertMode === "append"
          ? appendGeneratedNodes(query, data.builderData.nodes)
          : data.builderData.nodes;
      onRemountWithJson(JSON.stringify(nextNodes));
      emitGeneratedSeo(data.seo, onAiSeoGenerated);
      setAiDialogOpen(false);
      setAiPrompt("");
      toast.success(
        aiInsertMode === "append"
          ? t("AI sections appended.")
          : t("AI page generated."),
      );
    } catch {
      toast.error(t("AI page generation failed."));
    } finally {
      setAiGenerating(false);
    }
  }

  return (
    <div className="sticky top-[var(--sticky-header-h,0px)] z-30 flex min-h-[var(--builder-toolbar-h,49px)] flex-wrap items-center gap-2 border-b bg-background/95 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!canUndo}
        onClick={() => actions.history.undo()}
        aria-label={t("Undo")}
        title={t("Undo")}
      >
        <Undo2 className="h-4 w-4" />
        <span className="hidden sm:inline">{t("Undo")}</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!canRedo}
        onClick={() => actions.history.redo()}
        aria-label={t("Redo")}
        title={t("Redo")}
      >
        <Redo2 className="h-4 w-4" />
        <span className="hidden sm:inline">{t("Redo")}</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!selectedId || !isDeletable}
        onClick={handleDelete}
        aria-label={t("Delete")}
        title={t("Delete")}
      >
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline">{t("Delete")}</span>
      </Button>
      {aiAssistantAvailable && onAiAssistantActiveChange && (
        <div className="flex h-8 items-center gap-2 rounded-md border bg-background px-2 text-xs">
          <Sparkles aria-hidden className="h-3.5 w-3.5 text-primary" />
          <Label
            htmlFor="page-builder-ai-assistant"
            className="whitespace-nowrap text-xs font-medium"
          >
            {t("AI assistant")}
          </Label>
          <Switch
            id="page-builder-ai-assistant"
            checked={aiAssistantActive}
            onCheckedChange={onAiAssistantActiveChange}
            className="scale-90"
          />
          {aiProviderOptions.length > 0 && effectiveAiProviderId && (
            <div className="flex min-w-0 items-center gap-1 border-l pl-2">
              <span className="text-muted-foreground">{t("Provider:")}</span>
              {aiProviderOptions.length > 1 ? (
                <Select
                  value={effectiveAiProviderId}
                  onValueChange={(value) => {
                    const providerId = value as AIProviderId;
                    const provider = aiProviderOptions.find(
                      (option) => option.id === providerId,
                    );
                    onAiProviderIdChange?.(providerId);
                    onAiModelIdChange?.(
                      provider?.defaultModel ?? provider?.models[0]?.id ?? "",
                    );
                  }}
                >
                  <SelectTrigger
                    aria-label={t("AI provider")}
                    className="h-7 w-28 rounded-md px-2 text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {aiProviderOptions.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="truncate font-medium">
                  {selectedAiProviderLabel}
                </span>
              )}
            </div>
          )}
          {selectedAiProvider && selectedAiProvider.models.length > 0 && (
            <div className="flex min-w-0 items-center gap-1 border-l pl-2">
              <span className="text-muted-foreground">{t("Model:")}</span>
              {selectedAiProvider.models.length > 1 ? (
                <Select
                  value={effectiveAiModelId}
                  onValueChange={(value) => onAiModelIdChange?.(value)}
                >
                  <SelectTrigger
                    aria-label={t("AI model")}
                    className="h-7 w-36 rounded-md px-2 text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedAiProvider.models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="max-w-36 truncate font-medium">
                  {selectedAiModelLabel}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      {aiAssistantAvailable && aiAssistantActive && (
        <Button
          type="button"
          size="sm"
          variant="default"
          disabled={sourceMode || !effectiveAiProviderId || !effectiveAiModelId}
          onClick={() => setAiDialogOpen(true)}
          aria-label={t("Generate page with AI")}
          title={t("Generate page with AI")}
        >
          <Wand2 className="h-4 w-4" />
          <span className="hidden sm:inline">{t("Generate page")}</span>
        </Button>
      )}
      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant={focusMode ? "default" : "outline"}
          onClick={onToggleFocusMode}
          aria-label={focusMode ? t("Exit focus mode") : t("Focus mode")}
          title={focusMode ? t("Exit focus mode") : t("Focus mode")}
        >
          {focusMode ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {focusMode ? t("Exit focus") : t("Focus")}
          </span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant={sourceMode ? "default" : "outline"}
          onClick={onToggleSource}
          className="ml-2"
          aria-label={sourceMode ? t("Visual") : t("Source")}
          title={sourceMode ? t("Visual") : t("Source")}
        >
          {sourceMode ? t("Visual") : t("Source")}
        </Button>
      </div>
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("AI page builder")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("Generate Craft.js page blocks from a prompt.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="page-builder-ai-prompt">{t("Prompt")}</Label>
              <Textarea
                id="page-builder-ai-prompt"
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                rows={5}
                maxLength={2_000}
                placeholder={t(
                  "Create landing page for DevOps consulting company",
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-builder-ai-mode">{t("Mode")}</Label>
              <Select
                value={aiInsertMode}
                onValueChange={(value) =>
                  setAiInsertMode(value as "replace" | "append")
                }
              >
                <SelectTrigger id="page-builder-ai-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="replace">{t("Replace page")}</SelectItem>
                  <SelectItem value="append">{t("Append sections")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedAiModelCostWarning && (
              <div
                className={cn(
                  "flex items-start gap-2 rounded-md border px-3 py-2 text-xs leading-5",
                  selectedAiModelCostWarning.tone === "danger"
                    ? "border-red-500/50 bg-red-500/10 text-red-950 dark:text-red-100"
                    : "border-amber-500/45 bg-amber-500/10 text-amber-950 dark:text-amber-100",
                )}
              >
                <TriangleAlert
                  aria-hidden
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <div className="space-y-1">
                  <p>{t(selectedAiModelCostWarning.text)}</p>
                  <p>
                    {t(
                      "Page builder uses a separate larger JSON budget of about 2,800-4,000 output tokens.",
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAiDialogOpen(false)}
              disabled={aiGenerating}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleGeneratePage}
              disabled={aiGenerating || aiPrompt.trim().length < 8}
            >
              {aiGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {t("Generate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type EditorQuery = {
  serialize: () => string;
};

function hasCurrentRootChildren(query: EditorQuery) {
  try {
    const nodes = JSON.parse(query.serialize()) as BuilderData["nodes"];
    return (nodes[ROOT_NODE_ID]?.nodes ?? []).length > 0;
  } catch {
    return false;
  }
}

function appendGeneratedNodes(
  query: EditorQuery,
  generatedNodes: BuilderData["nodes"],
) {
  const currentNodes = readCurrentBuilderNodes(query);
  const next = cloneNodes(currentNodes);
  next[ROOT_NODE_ID] ??= cloneNodes(emptyBuilderData.nodes)[ROOT_NODE_ID];

  const generatedRoot = generatedNodes[ROOT_NODE_ID];
  const generatedChildIds = generatedRoot?.nodes ?? [];
  const usedIds = new Set(Object.keys(next));
  const idMap = new Map<string, string>();

  for (const id of Object.keys(generatedNodes)) {
    if (id === ROOT_NODE_ID) continue;
    const nextId = uniqueNodeId(id, usedIds);
    idMap.set(id, nextId);
    usedIds.add(nextId);
  }

  for (const [oldId, node] of Object.entries(generatedNodes)) {
    if (oldId === ROOT_NODE_ID) continue;
    const newId = idMap.get(oldId);
    if (!newId) continue;

    const parent =
      node.parent === ROOT_NODE_ID
        ? ROOT_NODE_ID
        : node.parent
          ? (idMap.get(node.parent) ?? ROOT_NODE_ID)
          : null;

    next[newId] = {
      ...cloneNode(node),
      parent,
      nodes: (node.nodes ?? [])
        .map((childId) => idMap.get(childId))
        .filter((childId): childId is string => !!childId),
      linkedNodes: Object.fromEntries(
        Object.entries(node.linkedNodes ?? {})
          .map(([slotId, childId]) => [slotId, idMap.get(childId)])
          .filter((entry): entry is [string, string] => !!entry[1]),
      ),
    };
  }

  const appendedRootChildren = generatedChildIds
    .map((id) => idMap.get(id))
    .filter((id): id is string => !!id && !!next[id]);
  for (const childId of appendedRootChildren) {
    next[childId].parent = ROOT_NODE_ID;
  }
  next[ROOT_NODE_ID].nodes = [
    ...(next[ROOT_NODE_ID].nodes ?? []),
    ...appendedRootChildren,
  ];

  return next;
}

function readCurrentBuilderNodes(query: EditorQuery): BuilderData["nodes"] {
  try {
    const nodes = JSON.parse(query.serialize()) as BuilderData["nodes"];
    if (nodes && typeof nodes === "object" && nodes[ROOT_NODE_ID]) {
      return nodes;
    }
  } catch {
    /* ignore */
  }
  return emptyBuilderData.nodes;
}

function builderNodesToPlainText(query: EditorQuery) {
  const nodes = readCurrentBuilderNodes(query);
  const parts: string[] = [];
  const visited = new Set<string>();

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = nodes[nodeId];
    if (!node || node.hidden) return;

    collectNodeText(node.props, parts);
    for (const childId of node.nodes ?? []) visit(childId);
    for (const childId of Object.values(node.linkedNodes ?? {})) visit(childId);
  }

  visit(ROOT_NODE_ID);
  return normalizePlainText(parts.join("\n")).slice(0, 8_000);
}

function collectNodeText(props: Record<string, unknown>, parts: string[]) {
  for (const [key, value] of Object.entries(props)) {
    if (
      key === "content" ||
      key === "title" ||
      key === "subtitle" ||
      key === "label"
    ) {
      const text = typeof value === "string" ? value : tiptapToPlainText(value);
      if (text.trim()) parts.push(text);
    }
  }
}

function tiptapToPlainText(value: unknown) {
  const parts: string[] = [];
  collectTiptapText(value, parts);
  return normalizePlainText(parts.join(""));
}

function collectTiptapText(value: unknown, parts: string[]) {
  if (!value || typeof value !== "object") return;
  const node = value as {
    type?: unknown;
    text?: unknown;
    content?: unknown;
  };
  const type = typeof node.type === "string" ? node.type : "";
  const isBlock =
    type === "paragraph" ||
    type === "heading" ||
    type === "blockquote" ||
    type === "listItem";

  if (isBlock && parts.length > 0 && parts.at(-1) !== "\n") parts.push("\n");
  if (typeof node.text === "string") parts.push(node.text);
  if (Array.isArray(node.content)) {
    for (const child of node.content) collectTiptapText(child, parts);
  }
  if (isBlock && parts.at(-1) !== "\n") parts.push("\n");
}

function normalizePlainText(value: string) {
  return value
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cloneNodes(nodes: BuilderData["nodes"]): BuilderData["nodes"] {
  return JSON.parse(JSON.stringify(nodes)) as BuilderData["nodes"];
}

function cloneNode(node: SerializedNode): SerializedNode {
  return JSON.parse(JSON.stringify(node)) as SerializedNode;
}

function uniqueNodeId(baseId: string, usedIds: Set<string>) {
  if (!usedIds.has(baseId)) return baseId;
  let index = 1;
  let candidate = `${baseId}_${index}`;
  while (usedIds.has(candidate)) {
    index += 1;
    candidate = `${baseId}_${index}`;
  }
  return candidate;
}

function emitGeneratedSeo(
  value: unknown,
  onAiSeoGenerated:
    | ((seo: { metaTitle?: string; metaDescription?: string }) => void)
    | undefined,
) {
  if (!onAiSeoGenerated || !value || typeof value !== "object") return;
  const seo = value as { metaTitle?: unknown; metaDescription?: unknown };
  const metaTitle =
    typeof seo.metaTitle === "string" ? seo.metaTitle.trim() : undefined;
  const metaDescription =
    typeof seo.metaDescription === "string"
      ? seo.metaDescription.trim()
      : undefined;
  if (!metaTitle && !metaDescription) return;
  onAiSeoGenerated({ metaTitle, metaDescription });
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
