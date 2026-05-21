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

export type StaticRegistry = Record<
  string,
  (props: Record<string, unknown> & { children?: ReactNode }) => ReactNode
>;

/**
 * Resolved-name → static React component map. Mirrors `resolver` in
 * `blocks/editable.tsx` but uses the pure JSX renderers (no Craft.js,
 * no Tiptap React) so it can be safely imported from both RSC and from
 * the client-side editor (used to produce the source view via
 * `react-dom/server.renderToStaticMarkup`).
 *
 * NOTE: this module MUST stay free of any server-only imports (DB,
 * `server-only`, etc.) because the client editor imports `renderTree`.
 * The async `Gallery` renderer lives in `server-render-rsc.tsx` and is
 * injected via the optional `registry` argument below.
 */
export const defaultStaticRegistry: StaticRegistry = {
  Root: RootStatic as never,
  Section: SectionStatic as never,
  // Inner canvas slot of a Section — just passes children through.
  SectionSlot: ({ children }) => <>{children}</>,
  Columns: ColumnsStatic as never,
  // Column slots inside Columns just render their children.
  ColumnSlot: ({ children }) => <div>{children}</div>,
  Heading: HeadingStatic as never,
  Text: TextStatic as never,
  Image: ImageStatic as never,
  Button: ButtonStatic as never,
  Hero: HeroStatic as never,
  RawHtml: RawHtmlStatic as never,
  // Synchronous client-safe placeholder. The RSC entry overrides this
  // with the async `GalleryStatic` that fetches & renders real images.
  Gallery: ({
    galleryName,
  }: Record<string, unknown> & { children?: ReactNode }) => (
    <div className="my-4 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
      Gallery
      {typeof galleryName === "string" && galleryName ? `: ${galleryName}` : ""}
    </div>
  ),
  // Synchronous client-safe placeholder. The RSC entry overrides this with
  // the async `FormStatic` that fetches and renders the real form.
  Form: ({ formName }: Record<string, unknown> & { children?: ReactNode }) => (
    <div className="my-4 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
      Form
      {typeof formName === "string" && formName ? `: ${formName}` : ""}
    </div>
  ),
  // Synchronous client-safe placeholder. The RSC entry overrides this with
  // the async `FormSubmissionsStatic` that fetches and renders real submissions.
  FormSubmissions: ({
    formId,
  }: Record<string, unknown> & { children?: ReactNode }) => (
    <div className="my-4 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
      Form Submissions
      {typeof formId === "string" && formId ? ` (${formId.slice(0, 8)})` : ""}
    </div>
  ),
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
  registry: StaticRegistry = defaultStaticRegistry,
): ReactElement | null {
  const node = nodes[id];
  if (!node || node.hidden) return null;

  const name = resolvedName(node);
  const Cmp = registry[name];
  if (!Cmp) {
    return (
      <div key={id} className="p-2 text-xs text-muted-foreground">
        Unknown block: {name}
      </div>
    );
  }

  // Render direct child nodes.
  const directChildren = (node.nodes ?? []).map((childId) =>
    renderNode(childId, nodes, registry),
  );

  // Render linked nodes (e.g. Columns has linkedNodes.left / .right).
  // Each linked subtree is rendered into its own wrapper child.
  const linked = node.linkedNodes ?? {};
  const linkedChildren = Object.entries(linked).map(([slotId, childId]) =>
    renderNode(childId, nodes, registry) ? (
      <span key={`linked-${slotId}`}>
        {renderNode(childId, nodes, registry)}
      </span>
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
  ) as ReactElement;
}

/** Render an entire BuilderData envelope, starting from ROOT. */
export function renderTree(
  data: BuilderData,
  registry: StaticRegistry = defaultStaticRegistry,
): ReactElement | null {
  return renderNode(ROOT_NODE_ID, data.nodes, registry);
}

/**
 * RSC entry point that uses the client-safe registry only. Suitable for
 * server pages that don't need async block renderers. For the full
 * registry (with the async Gallery), import `BuilderRender` from
 * `server-render-rsc.tsx` instead.
 */
export function BuilderRender({ data }: { data: unknown }) {
  if (!isBuilderData(data)) return null;
  return renderTree(data);
}

export { isBuilderData };
