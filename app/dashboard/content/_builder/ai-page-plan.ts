import { z } from "zod";

import {
  getLayoutColumnCount,
  normalizeLayoutKind,
  type LayoutGap,
  type LayoutKind,
} from "@/app/dashboard/content/_editors/layout-presets";
import { sanitizeHref, sanitizeMediaSrc } from "@/lib/url-safety";
import type { BlockStyle } from "./blocks/style/types";
import { defaults } from "./blocks/types";
import { ROOT_NODE_ID, type BuilderData, type SerializedNode } from "./types";

const text = (max: number) => z.string().trim().min(1).max(max);

const AiPlanVariantSchema = z
  .enum(["default", "muted", "accent", "contrast", "minimal"])
  .default("default");

const AiPlanGapSchema = z.enum(["sm", "md", "lg"]).default("md");

export type AiPagePlanVariant = z.infer<typeof AiPlanVariantSchema>;

export type AiPageBlockPlan =
  | {
      block: "Hero";
      title: string;
      subtitle: string;
      variant?: AiPagePlanVariant;
    }
  | {
      block: "Section";
      variant?: AiPagePlanVariant;
      padded?: boolean;
      children: AiPageBlockPlan[];
    }
  | {
      block: "Layout";
      preset?: LayoutKind;
      gap?: LayoutGap;
      variant?: AiPagePlanVariant;
      columns: AiPageBlockPlan[][];
    }
  | {
      block: "Heading";
      level?: "1" | "2" | "3" | "4";
      text: string;
      variant?: AiPagePlanVariant;
    }
  | {
      block: "Text";
      text: string;
      variant?: AiPagePlanVariant;
    }
  | {
      block: "Button";
      label: string;
      href?: string;
      variant?: AiPagePlanVariant;
    }
  | {
      block: "Image";
      src?: string;
      alt: string;
      variant?: AiPagePlanVariant;
    };

const AiPageBlockSchema: z.ZodType<AiPageBlockPlan> = z.lazy(() =>
  z.discriminatedUnion("block", [
    z.object({
      block: z.literal("Hero"),
      title: text(140),
      subtitle: text(420),
      variant: AiPlanVariantSchema.optional(),
    }),
    z.object({
      block: z.literal("Section"),
      variant: AiPlanVariantSchema.optional(),
      padded: z.boolean().optional(),
      children: z.array(AiPageBlockSchema).min(1).max(8),
    }),
    z.object({
      block: z.literal("Layout"),
      preset: z
        .enum([
          "1-col",
          "2-col",
          "3-col",
          "4-col",
          "70-30",
          "30-70",
          "60-40",
          "40-60",
        ])
        .optional(),
      gap: AiPlanGapSchema.optional(),
      variant: AiPlanVariantSchema.optional(),
      columns: z.array(z.array(AiPageBlockSchema).max(5)).min(1).max(4),
    }),
    z.object({
      block: z.literal("Heading"),
      level: z.enum(["1", "2", "3", "4"]).optional(),
      text: text(180),
      variant: AiPlanVariantSchema.optional(),
    }),
    z.object({
      block: z.literal("Text"),
      text: text(1_500),
      variant: AiPlanVariantSchema.optional(),
    }),
    z.object({
      block: z.literal("Button"),
      label: text(80),
      href: z.string().trim().max(500).optional(),
      variant: AiPlanVariantSchema.optional(),
    }),
    z.object({
      block: z.literal("Image"),
      src: z.string().trim().max(1_000).optional(),
      alt: text(160),
      variant: AiPlanVariantSchema.optional(),
    }),
  ]),
);

export const AiPagePlanSchema = z.object({
  blocks: z.array(AiPageBlockSchema).min(1).max(10),
  seo: z
    .object({
      metaTitle: z.string().trim().max(80).optional(),
      metaDescription: z.string().trim().max(180).optional(),
    })
    .optional(),
});

export type AiPagePlan = z.infer<typeof AiPagePlanSchema>;

export type AiPagePlanParseResult =
  | { ok: true; plan: AiPagePlan }
  | { ok: false; error: string };

const MAX_GENERATED_NODES = 80;
const MAX_BLOCK_DEPTH = 5;

type BuildContext = {
  nodes: BuilderData["nodes"];
  nextIndex: number;
  nodeCount: number;
};

export function parseAiPagePlanOutput(output: string): AiPagePlanParseResult {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(extractJsonObject(output));
  } catch {
    return { ok: false, error: "AI did not return valid JSON." };
  }

  const parsed = AiPagePlanSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "AI returned a page plan that does not match the builder schema.",
    };
  }

  return { ok: true, plan: parsed.data };
}

export function buildBuilderDataFromAiPagePlan(plan: AiPagePlan): BuilderData {
  const ctx: BuildContext = {
    nodes: {
      [ROOT_NODE_ID]: {
        type: { resolvedName: "Root" },
        isCanvas: true,
        props: {},
        displayName: "Root",
        custom: {},
        parent: null,
        hidden: false,
        nodes: [],
        linkedNodes: {},
      },
    },
    nextIndex: 0,
    nodeCount: 1,
  };

  for (const block of plan.blocks) {
    const nodeId = addBlock(ctx, block, ROOT_NODE_ID, 0);
    if (nodeId) ctx.nodes[ROOT_NODE_ID].nodes.push(nodeId);
  }

  return { version: 1, nodes: ctx.nodes };
}

function addBlock(
  ctx: BuildContext,
  block: AiPageBlockPlan,
  parentId: string,
  depth: number,
): string | null {
  if (ctx.nodeCount >= MAX_GENERATED_NODES || depth > MAX_BLOCK_DEPTH) {
    return null;
  }

  switch (block.block) {
    case "Hero":
      return addLeaf(ctx, "Hero", parentId, {
        ...defaults.Hero,
        title: inlineDoc(block.title),
        subtitle: richTextDoc(block.subtitle),
        style: heroStyle(block.variant),
      });
    case "Section":
      return addSection(ctx, block, parentId, depth);
    case "Layout":
      return addLayout(ctx, block, parentId, depth);
    case "Heading":
      return addLeaf(ctx, "Heading", parentId, {
        ...defaults.Heading,
        level: block.level ?? "2",
        content: inlineDoc(block.text),
        style: headingStyle(block.variant),
      });
    case "Text":
      return addLeaf(ctx, "Text", parentId, {
        ...defaults.Text,
        content: richTextDoc(block.text),
        style: textStyle(block.variant),
      });
    case "Button":
      return addLeaf(ctx, "Button", parentId, {
        ...defaults.Button,
        label: block.label,
        href: sanitizeHref(block.href, "#"),
        style: buttonStyle(block.variant),
      });
    case "Image":
      return addLeaf(ctx, "Image", parentId, {
        ...defaults.Image,
        src: sanitizeMediaSrc(block.src),
        alt: block.alt,
        style: imageStyle(block.variant),
      });
  }
}

function addSection(
  ctx: BuildContext,
  block: Extract<AiPageBlockPlan, { block: "Section" }>,
  parentId: string,
  depth: number,
) {
  const sectionId = nextNodeId(ctx, "section");
  const slotId = nextNodeId(ctx, "section_content");

  ctx.nodes[sectionId] = createNode(sectionId, "Section", parentId, {
    ...defaults.Section,
    padded: block.padded ?? true,
    style: sectionStyle(block.variant),
  });
  ctx.nodes[sectionId].linkedNodes = { content: slotId };

  ctx.nodes[slotId] = createNode(slotId, "SectionSlot", sectionId, {}, true);
  ctx.nodes[slotId].displayName = "Section content";

  for (const child of block.children) {
    const childId = addBlock(ctx, child, slotId, depth + 1);
    if (childId) ctx.nodes[slotId].nodes.push(childId);
  }

  return sectionId;
}

function addLayout(
  ctx: BuildContext,
  block: Extract<AiPageBlockPlan, { block: "Layout" }>,
  parentId: string,
  depth: number,
) {
  const layoutPreset = resolveLayoutPreset(block);
  const columnCount = getLayoutColumnCount(layoutPreset);
  const layoutId = nextNodeId(ctx, "layout");

  ctx.nodes[layoutId] = createNode(layoutId, "Layout", parentId, {
    ...defaults.Layout,
    preset: layoutPreset,
    gap: block.gap ?? "md",
    style: layoutStyle(block.variant),
  });

  for (let index = 1; index <= columnCount; index += 1) {
    const slotId = nextNodeId(ctx, `layout_slot_${index}`);
    ctx.nodes[layoutId].linkedNodes[`slot-${index}`] = slotId;
    ctx.nodes[slotId] = createNode(
      slotId,
      "LayoutSlot",
      layoutId,
      { index },
      true,
    );
    ctx.nodes[slotId].displayName = "Layout column";

    for (const child of block.columns[index - 1] ?? []) {
      const childId = addBlock(ctx, child, slotId, depth + 1);
      if (childId) ctx.nodes[slotId].nodes.push(childId);
    }
  }

  return layoutId;
}

function addLeaf(
  ctx: BuildContext,
  name: string,
  parentId: string,
  props: Record<string, unknown>,
) {
  const id = nextNodeId(ctx, name);
  ctx.nodes[id] = createNode(id, name, parentId, pruneUndefined(props));
  return id;
}

function createNode(
  id: string,
  name: string,
  parent: string | null,
  props: Record<string, unknown>,
  isCanvas = false,
): SerializedNode {
  return {
    type: { resolvedName: name },
    isCanvas,
    props,
    displayName: displayNameForNode(name),
    custom: {},
    parent,
    hidden: false,
    nodes: [],
    linkedNodes: {},
  };
}

function nextNodeId(ctx: BuildContext, label: string) {
  ctx.nextIndex += 1;
  ctx.nodeCount += 1;
  return `ai_${label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${ctx.nextIndex}`;
}

function displayNameForNode(name: string) {
  if (name === "Layout") return "LAYOUT";
  if (name === "SectionSlot") return "Section content";
  if (name === "LayoutSlot") return "Layout column";
  return name;
}

function inlineDoc(value: string) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: normalizeText(value).slice(0, 500) }],
      },
    ],
  };
}

function richTextDoc(value: string) {
  const paragraphs = normalizeText(value)
    .split(/\n{2,}|\n/u)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 6);

  return {
    type: "doc",
    content:
      paragraphs.length > 0
        ? paragraphs.map((paragraph) => ({
            type: "paragraph",
            content: [{ type: "text", text: paragraph.slice(0, 1_000) }],
          }))
        : [{ type: "paragraph" }],
  };
}

function normalizeText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function resolveLayoutPreset(
  block: Extract<AiPageBlockPlan, { block: "Layout" }>,
): LayoutKind {
  if (block.preset) return normalizeLayoutKind(block.preset);
  const count = Math.max(1, Math.min(4, block.columns.length));
  return count === 1
    ? "1-col"
    : count === 3
      ? "3-col"
      : count === 4
        ? "4-col"
        : "2-col";
}

function extractJsonObject(output: string) {
  const cleaned = output
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/```\s*$/u, "")
    .trim();
  const start = cleaned.indexOf("{");
  if (start < 0) return cleaned;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < cleaned.length; index += 1) {
    const char = cleaned[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return cleaned.slice(start, index + 1);
    }
  }

  return cleaned.slice(start);
}

function pruneUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

function heroStyle(variant: AiPagePlanVariant = "default"): BlockStyle {
  return {
    ...variantSurfaceStyle(variant),
    spacing: {
      padding: { top: "3rem", right: "2rem", bottom: "3rem", left: "2rem" },
    },
    borderEffects: {
      borderRadius: "var(--radius)",
      boxShadow: variant === "minimal" ? "none" : "sm",
    },
  };
}

function sectionStyle(
  variant: AiPagePlanVariant = "default",
): BlockStyle | undefined {
  if (variant === "default") return undefined;
  return {
    ...variantSurfaceStyle(variant),
    spacing: {
      padding: { top: "2rem", right: "2rem", bottom: "2rem", left: "2rem" },
    },
    borderEffects: {
      borderWidth: variant === "minimal" ? undefined : "1px",
      borderColor: "border",
      borderStyle: "solid",
      borderRadius: "var(--radius)",
      boxShadow: variant === "contrast" ? "md" : "none",
    },
  };
}

function layoutStyle(
  variant: AiPagePlanVariant = "default",
): BlockStyle | undefined {
  if (variant === "default") return undefined;
  return {
    spacing: { gap: variant === "minimal" ? "1rem" : "1.5rem" },
  };
}

function headingStyle(
  variant: AiPagePlanVariant = "default",
): BlockStyle | undefined {
  if (variant === "default") return undefined;
  return {
    typography: { fontFamily: "heading", fontWeight: "700" },
    colors: variant === "contrast" ? { text: "primary" } : undefined,
  };
}

function textStyle(
  variant: AiPagePlanVariant = "default",
): BlockStyle | undefined {
  if (variant === "default") return undefined;
  return {
    colors: variant === "muted" ? { text: "muted-foreground" } : undefined,
  };
}

function buttonStyle(
  variant: AiPagePlanVariant = "default",
): BlockStyle | undefined {
  if (variant === "default" || variant === "contrast") return undefined;
  return {
    borderEffects: { borderRadius: "var(--radius)", boxShadow: "xs" },
  };
}

function imageStyle(
  variant: AiPagePlanVariant = "default",
): BlockStyle | undefined {
  if (variant === "default") return undefined;
  return {
    borderEffects: { borderRadius: "var(--radius)", boxShadow: "sm" },
  };
}

function variantSurfaceStyle(variant: AiPagePlanVariant): BlockStyle {
  if (variant === "muted") {
    return {
      colors: { background: "muted", text: "foreground" },
    };
  }
  if (variant === "accent") {
    return {
      colors: { background: "accent", text: "accent-foreground" },
    };
  }
  if (variant === "contrast") {
    return {
      colors: { background: "primary", text: "primary-foreground" },
    };
  }
  return {};
}
