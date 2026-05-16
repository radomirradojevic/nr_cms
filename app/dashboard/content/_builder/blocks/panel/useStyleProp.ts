"use client";

import { useNode } from "@craftjs/core";
import { useCallback } from "react";
import type { BlockStyle, BlockStyleBase, Viewport } from "../style/types";
import { useViewport } from "./viewport-context";

type WithStyle = { style?: BlockStyle };

type Path = string[];

function getAt(obj: unknown, path: Path): unknown {
  let cur: unknown = obj;
  for (const p of path) {
    if (
      cur &&
      typeof cur === "object" &&
      p in (cur as Record<string, unknown>)
    ) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

function setAt(
  target: Record<string, unknown>,
  path: Path,
  value: unknown,
): void {
  let cur: Record<string, unknown> = target;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    const next = cur[k];
    if (!next || typeof next !== "object") {
      cur[k] = {};
    }
    cur = cur[k] as Record<string, unknown>;
  }
  const last = path[path.length - 1];
  if (value === undefined || value === null || value === "") {
    delete cur[last];
  } else {
    cur[last] = value;
  }
}

function cleanupEmpty(target: Record<string, unknown>, path: Path): void {
  // Walk the path bottom-up; remove any empty objects we created.
  for (let depth = path.length - 1; depth > 0; depth--) {
    const parentPath = path.slice(0, depth);
    let parent: Record<string, unknown> = target;
    for (const p of parentPath.slice(0, -1)) {
      const next = parent[p];
      if (!next || typeof next !== "object") return;
      parent = next as Record<string, unknown>;
    }
    const key = parentPath[parentPath.length - 1];
    const node = parent[key];
    if (
      node &&
      typeof node === "object" &&
      !Array.isArray(node) &&
      Object.keys(node as Record<string, unknown>).length === 0
    ) {
      delete parent[key];
    }
  }
}

/**
 * Hook for the BlockSettingsPanel that mutates `props.style` on the
 * selected Craft.js node via `setProp`. Provides typed accessors that
 * honor the active viewport (base vs. `responsive.tablet` / `.mobile`
 * partial overrides).
 *
 * `viewport === "desktop"` writes the base envelope. Other viewports
 * write into `style.responsive[viewport]`.
 */
export function useStyleProp() {
  const { viewport } = useViewport();
  const {
    actions: { setProp },
    style,
  } = useNode((n) => ({ style: (n.data.props as WithStyle).style }));

  const basePath = useCallback(
    (sectionPath: Path): Path => {
      if (viewport === "desktop") return sectionPath;
      return ["responsive", viewport, ...sectionPath];
    },
    [viewport],
  );

  const get = useCallback(
    <T>(sectionPath: Path): T | undefined => {
      return getAt(style ?? {}, basePath(sectionPath)) as T | undefined;
    },
    [style, basePath],
  );

  /** Always read from the BASE (desktop) style — used to show "Inherited" hints. */
  const getBase = useCallback(
    <T>(sectionPath: Path): T | undefined => {
      return getAt(style ?? {}, sectionPath) as T | undefined;
    },
    [style],
  );

  const set = useCallback(
    (sectionPath: Path, value: unknown): void => {
      const fullPath = basePath(sectionPath);
      setProp((p: WithStyle) => {
        if (!p.style) p.style = {};
        const root = p.style as unknown as Record<string, unknown>;
        setAt(root, fullPath, value);
        cleanupEmpty(root, fullPath);
        // Also clean up `responsive` shell if empty
        if (
          root.responsive &&
          typeof root.responsive === "object" &&
          Object.keys(root.responsive as Record<string, unknown>).length === 0
        ) {
          delete root.responsive;
        }
      });
    },
    [basePath, setProp],
  );

  /** Writes a hide flag at `responsive.hide.<viewport>`. */
  const setHide = useCallback(
    (v: Viewport, hidden: boolean): void => {
      setProp((p: WithStyle) => {
        if (!p.style) p.style = {};
        if (!p.style.responsive) p.style.responsive = {};
        if (!p.style.responsive.hide) p.style.responsive.hide = {};
        if (hidden) {
          p.style.responsive.hide[v] = true;
        } else {
          delete p.style.responsive.hide[v];
        }
        if (Object.keys(p.style.responsive.hide).length === 0) {
          delete p.style.responsive.hide;
        }
        if (Object.keys(p.style.responsive).length === 0) {
          delete p.style.responsive;
        }
      });
    },
    [setProp],
  );

  return {
    viewport,
    style,
    get,
    getBase,
    set,
    setHide,
  };
}

export type { BlockStyle, BlockStyleBase };
