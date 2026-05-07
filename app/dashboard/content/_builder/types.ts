/**
 * Storage envelope for the page builder.
 *
 * `nodes` is the JSON tree produced by Craft.js `query.serialize()`
 * (a record keyed by node id). We wrap it in an envelope with a `version`
 * so we can migrate the schema later without breaking older rows.
 */
export type BuilderData = {
  version: 1;
  nodes: Record<string, SerializedNode>;
};

/**
 * Subset of the serialized Craft.js node shape we rely on.
 * Kept loose on `props` because each block defines its own.
 */
export type SerializedNode = {
  type: { resolvedName: string } | string;
  isCanvas?: boolean;
  props: Record<string, unknown>;
  displayName?: string;
  custom?: Record<string, unknown>;
  parent?: string | null;
  hidden?: boolean;
  nodes: string[];
  linkedNodes: Record<string, string>;
};

export const ROOT_NODE_ID = "ROOT";

export const emptyBuilderData: BuilderData = {
  version: 1,
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
};

/**
 * Type-guard: returns true if `value` looks like a BuilderData envelope.
 * Used at the boundary (DB → renderer / DB → editor) to handle legacy or
 * unknown shapes safely.
 */
export function isBuilderData(value: unknown): value is BuilderData {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<BuilderData>;
  return v.version === 1 && !!v.nodes && typeof v.nodes === "object";
}
