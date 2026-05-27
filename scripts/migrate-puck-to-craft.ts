/**
 * One-shot migration: convert legacy Puck `contentJson` rows into the new
 * BuilderData envelope used by the Craft.js page builder.
 *
 * Run once after deploying the new builder:
 *   npx tsx scripts/migrate-puck-to-craft.ts
 *
 * Idempotent: rows already in BuilderData shape are skipped.
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { content } from "@/db/schema";

type PuckItem = {
  type: string;
  props: Record<string, unknown> & { id?: string };
};
type PuckData = {
  content: PuckItem[];
  root?: { props?: Record<string, unknown> };
};

type SerializedNode = {
  type: { resolvedName: string };
  isCanvas?: boolean;
  props: Record<string, unknown>;
  displayName?: string;
  custom?: Record<string, unknown>;
  parent?: string | null;
  hidden?: boolean;
  nodes: string[];
  linkedNodes: Record<string, string>;
};

const ROOT = "ROOT";

function inlineDoc(text: string) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: text ? [{ type: "text", text }] : [],
      },
    ],
  };
}

function isPuckData(v: unknown): v is PuckData {
  return !!v && typeof v === "object" && Array.isArray((v as PuckData).content);
}

function isBuilderData(v: unknown): boolean {
  return (
    !!v &&
    typeof v === "object" &&
    (v as { version?: number }).version === 1 &&
    typeof (v as { nodes?: unknown }).nodes === "object"
  );
}

function nid() {
  return randomUUID().replace(/-/g, "").slice(0, 10);
}

function convert(puck: PuckData) {
  const nodes: Record<string, SerializedNode> = {
    [ROOT]: {
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
  };

  for (const item of puck.content) {
    const id = nid();
    const props = item.props ?? {};
    let node: SerializedNode | null = null;

    switch (item.type) {
      case "Heading":
        node = mkLeaf(id, "Heading", {
          content: inlineDoc(String(props.text ?? "")),
          level: String(props.level ?? "2"),
        });
        break;
      case "Text":
        node = mkLeaf(id, "Text", {
          content: inlineDoc(String(props.text ?? "")),
        });
        break;
      case "Image":
        node = mkLeaf(id, "Image", {
          src: String(props.src ?? ""),
          alt: String(props.alt ?? ""),
        });
        break;
      case "Button":
        node = mkLeaf(id, "Button", {
          label: String(props.label ?? "Click me"),
          href: String(props.href ?? "#"),
        });
        break;
      case "Hero":
        node = mkLeaf(id, "Hero", {
          title: inlineDoc(String(props.title ?? "")),
          subtitle: inlineDoc(String(props.subtitle ?? "")),
        });
        break;
      case "Columns": {
        const leftSlot = nid();
        const rightSlot = nid();
        const leftText = nid();
        const rightText = nid();
        node = {
          type: { resolvedName: "Columns" },
          isCanvas: false,
          props: { gap: "md" },
          displayName: "Columns",
          custom: {},
          parent: ROOT,
          hidden: false,
          nodes: [],
          linkedNodes: { left: leftSlot, right: rightSlot },
        };
        nodes[leftSlot] = mkCanvas(leftSlot, "ColumnSlot", id, [leftText]);
        nodes[rightSlot] = mkCanvas(rightSlot, "ColumnSlot", id, [rightText]);
        nodes[leftText] = mkLeaf(leftText, "Text", {
          content: inlineDoc(String(props.left ?? "")),
        });
        nodes[leftText].parent = leftSlot;
        nodes[rightText] = mkLeaf(rightText, "Text", {
          content: inlineDoc(String(props.right ?? "")),
        });
        nodes[rightText].parent = rightSlot;
        break;
      }
      default:
        // Unknown component → store as RawHtml comment so nothing is lost.
        node = mkLeaf(id, "RawHtml", {
          html: `<!-- migrated: unknown Puck component "${item.type}" -->`,
        });
        break;
    }

    nodes[id] = node;
    nodes[ROOT].nodes.push(id);
  }

  return { version: 1 as const, nodes };
}

function mkLeaf(
  id: string,
  name: string,
  props: Record<string, unknown>,
): SerializedNode {
  return {
    type: { resolvedName: name },
    isCanvas: false,
    props,
    displayName: name,
    custom: {},
    parent: ROOT,
    hidden: false,
    nodes: [],
    linkedNodes: {},
  };
}

function mkCanvas(
  id: string,
  name: string,
  parent: string,
  children: string[],
): SerializedNode {
  return {
    type: { resolvedName: name },
    isCanvas: true,
    props: {},
    displayName: name,
    custom: {},
    parent,
    hidden: false,
    nodes: children,
    linkedNodes: {},
  };
}

async function main() {
  const rows = await db
    .select()
    .from(content)
    .where(eq(content.contentType, "page"));
  let migrated = 0;
  let skipped = 0;
  let unknown = 0;

  for (const row of rows) {
    const json = row.contentJson;
    if (isBuilderData(json)) {
      skipped++;
      continue;
    }
    if (!isPuckData(json)) {
      console.warn(
        `[skip] ${row.id} (${row.slug}): unrecognised contentJson shape`,
      );
      unknown++;
      continue;
    }
    const next = convert(json);
    await db
      .update(content)
      .set({ contentJson: next, updatedAt: new Date() })
      .where(eq(content.id, row.id));
    migrated++;
    console.log(`[ok]   ${row.id} (${row.slug})`);
  }

  console.log(
    `\nDone. migrated=${migrated} skipped(already-builder)=${skipped} unknown=${unknown} total=${rows.length}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
