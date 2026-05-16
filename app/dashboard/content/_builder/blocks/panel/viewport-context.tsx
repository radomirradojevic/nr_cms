"use client";

import * as React from "react";
import type { Viewport } from "../style/types";

export type { Viewport };

type Ctx = {
  viewport: Viewport;
  setViewport: (v: Viewport) => void;
};

const ViewportContext = React.createContext<Ctx>({
  viewport: "desktop",
  setViewport: () => {},
});

/**
 * Editor-only context that tracks the currently previewed viewport. The
 * Settings panel's `ResponsiveTabs` switches it; the editor canvas wraps
 * its frame width with it; the editable block components read it to mirror
 * production media-query behavior inside the preview.
 *
 * Can be used uncontrolled (manages its own state) or controlled via
 * `value` + `onChange`.
 *
 * IMPORTANT: This context lives entirely inside the dashboard editor —
 * never use it in production SSR rendering paths.
 */
export function ViewportProvider({
  children,
  value,
  onChange,
}: {
  children: React.ReactNode;
  value?: Viewport;
  onChange?: (v: Viewport) => void;
}) {
  const [internal, setInternal] = React.useState<Viewport>("desktop");
  const isControlled = value !== undefined;
  const viewport = isControlled ? value : internal;
  const setViewport = React.useCallback(
    (v: Viewport) => {
      if (!isControlled) setInternal(v);
      onChange?.(v);
    },
    [isControlled, onChange],
  );
  const ctx = React.useMemo<Ctx>(
    () => ({ viewport, setViewport }),
    [viewport, setViewport],
  );
  return (
    <ViewportContext.Provider value={ctx}>{children}</ViewportContext.Provider>
  );
}

export function useViewport(): Ctx {
  return React.useContext(ViewportContext);
}
