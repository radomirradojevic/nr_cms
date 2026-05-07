import type { ReactElement, ReactNode } from "react";
import {
  ButtonStatic,
  ColumnsStatic,
  HeadingStatic,
  HeroStatic,
  ImageStatic,
  RawHtmlStatic,
  RootStatic,
  SectionStatic,
  TextStatic,
} from "./blocks/static";
import {
  ROOT_NODE_ID,
  isBuilderData,
  type BuilderData,
  type SerializedNode,
} from "./types";

/**
 * Resolved-name → static React component map. Mirrors `resolver` in
 * `blocks/editable.tsx` but uses the pure JSX renderers (no Craft.js,
 * no Tiptap React) so it can be used from RSC.
 */
const staticRegistry: Record<
  string,
  (props: Record<string, unknown> & { children?: ReactNode }) => ReactElement
> = {
  Root: RootStatic as never,
  Section: SectionStatic as never,
  Columns: ColumnsStatic as never,
  // Column slots inside Columns just render their children.
  ColumnSlot: ({ children }) => <div>{children}</div>,
  Heading: HeadingStatic as never,
  Text: TextStatic as never,
  Image: ImageStatic as never,
  Button: ButtonStatic as never,
  Hero: HeroStatic as never,
  RawHtml: RawHtmlStatic as never,
};

function resolvedName(node: SerializedNode): string {
  return typeof node.type === "string" ? node.type : node.type.resolvedName;
}

/**
 * Recursively render a serialized Craft.js node tree using the static
 * registry above. Linked nodes (e.g. Columns' "left"/"right" slots) are
 * passed through as children of their parent block.
 */
export function renderNode(
  id: string,
  nodes: BuilderData["nodes"],
): ReactElement | null {
  const node = nodes[id];
  if (!node || node.hidden) return null;

  const name = resolvedName(node);
  const Cmp = staticRegistry[name];
  if (!Cmp) {
    return (
      <div key={id} className="p-2 text-xs text-muted-foreground">
        Unknown block: {name}
      </div>
    );
  }

  // Render direct child nodes.
  const directChildren = (node.nodes ?? []).map((childId) =>
    renderNode(childId, nodes),
  );

  // Render linked nodes (e.g. Columns has linkedNodes.left / .right).
  // Each linked subtree is rendered into its own wrapper child.
  const linked = node.linkedNodes ?? {};
  const linkedChildren = Object.entries(linked).map(([slotId, childId]) =>
    renderNode(childId, nodes) ? (
      <span key={`linked-${slotId}`}>{renderNode(childId, nodes)}</span>
    ) : null,
  );

  const children =
    linkedChildren.length > 0
      ? linkedChildren
      : directChildren.length > 0
        ? directChildren
        : null;

  return (
    <Cmp key={id} {...node.props}>
      {children}
    </Cmp>
  );
}

/** Render an entire BuilderData envelope, starting from ROOT. */
export function renderTree(data: BuilderData): ReactElement | null {
  return renderNode(ROOT_NODE_ID, data.nodes);
}

/**
 * RSC entry point. Accepts the raw `contentJson` value from the DB and
 * renders it. Returns null for empty / unknown shapes.
 */
export function BuilderRender({ data }: { data: unknown }) {
  if (!isBuilderData(data)) return null;
  return renderTree(data);
}
