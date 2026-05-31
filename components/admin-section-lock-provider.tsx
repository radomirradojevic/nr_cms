"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useRegionalSettings } from "@/components/regional-settings-provider";
import {
  HEARTBEAT_INTERVAL_SECONDS,
  LEASE_TTL_SECONDS,
  TAKEOVER_GRACE_SECONDS,
  type AdminSectionLockHolder,
} from "@/lib/admin-section-locks";

type LockState =
  | { kind: "loading" }
  | { kind: "owner"; holder: AdminSectionLockHolder }
  | { kind: "locked"; holder: AdminSectionLockHolder }
  | { kind: "error"; message: string };

type LockContextValue = {
  state: LockState;
  clientId: string;
  /** True only when this user actively owns the lock. */
  isEditor: boolean;
  /** Convenience: includes pre-lock loading as "not yet editing". */
  isLoading: boolean;
};

const LockContext = createContext<LockContextValue | null>(null);

export function useAdminSectionLock(): LockContextValue {
  const ctx = useContext(LockContext);
  if (!ctx) {
    throw new Error(
      "useAdminSectionLock must be used inside <AdminSectionLockProvider>",
    );
  }
  return ctx;
}

export function useAdminSectionLockOptional(): LockContextValue | null {
  return useContext(LockContext);
}

type ProviderProps = {
  sectionKey: string;
  currentUserId: string;
  children: ReactNode;
};

function createClientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

/**
 * Wraps an admin singleton page (e.g. /dashboard/global-settings,
 * /dashboard/menus) with the same edit-lock behaviour as the content
 * editor: acquire on mount, heartbeat while active, release on real
 * navigation/close (pagehide), poll /status while locked-out so the second
 * admin sees the lock free up automatically when the holder leaves.
 *
 * Admin sections are admin-only, so admin-vs-admin takeover is forbidden
 * (per the locking spec). No takeover button is rendered — locked-out admins
 * see a "contact the other admin" message instead.
 *
 * IMPORTANT: switching browser tabs (visibilitychange=hidden) MUST NOT
 * release the lock. Tab-switching is normal multitasking; abandonment is
 * detected by the server-side lease expiring after `LEASE_TTL_SECONDS`.
 */
export function AdminSectionLockProvider({
  sectionKey,
  currentUserId,
  children,
}: ProviderProps) {
  const [clientId] = useState(createClientId);

  const [state, setState] = useState<LockState>({ kind: "loading" });
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockedPollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef<LockState>({ kind: "loading" });

  const apiBase = `/api/admin-section-locks/${encodeURIComponent(sectionKey)}`;

  const clearHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }, []);

  const doHeartbeat = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
        credentials: "same-origin",
      });
      if (res.status === 409) {
        clearHeartbeat();
        try {
          const statusRes = await fetch(`${apiBase}/status`, {
            credentials: "same-origin",
            cache: "no-store",
          });
          if (statusRes.ok) {
            const statusJson = (await statusRes.json()) as {
              holder: AdminSectionLockHolder | null;
            };
            if (
              statusJson.holder &&
              !(
                statusJson.holder.userId === currentUserId &&
                statusJson.holder.clientId === clientId
              )
            ) {
              setState({ kind: "locked", holder: statusJson.holder });
              return;
            }
          }
        } catch {
          /* fall through */
        }
        setState({ kind: "loading" });
        return;
      }
      if (!res.ok) return;
      const json = (await res.json()) as {
        ok: boolean;
        holder: AdminSectionLockHolder;
      };
      if (json.ok) {
        setState((prev) =>
          prev.kind === "owner"
            ? { ...prev, holder: json.holder }
            : { kind: "owner", holder: json.holder },
        );
      }
    } catch {
      /* network blip — wait for next interval */
    }
  }, [apiBase, clientId, currentUserId, clearHeartbeat]);

  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatTimer.current = setInterval(() => {
      void doHeartbeat();
    }, HEARTBEAT_INTERVAL_SECONDS * 1000);
  }, [clearHeartbeat, doHeartbeat]);

  const doRelease = useCallback(() => {
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      try {
        const blob = new Blob([JSON.stringify({ clientId })], {
          type: "application/json",
        });
        navigator.sendBeacon(`${apiBase}/release`, blob);
        return;
      } catch {
        /* fall through */
      }
    }
    try {
      void fetch(`${apiBase}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
        keepalive: true,
        credentials: "same-origin",
      });
    } catch {
      /* swallow */
    }
  }, [apiBase, clientId]);

  const doAcquire = useCallback(async () => {
    const prevKind = stateRef.current.kind;
    setState({ kind: "loading" });
    try {
      const res = await fetch(`${apiBase}/acquire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
        credentials: "same-origin",
      });
      const json = (await res.json()) as {
        ok: boolean;
        holder?: AdminSectionLockHolder;
        error?: string;
      };
      if (res.ok && json.ok && json.holder) {
        // Defense-in-depth: never enter "owner" state unless the holder
        // identity returned by the server matches THIS client. Protects
        // against any server-side regression, HMR-staleness, or driver
        // quirk that could otherwise grant ownership incorrectly.
        if (
          json.holder.userId !== currentUserId ||
          json.holder.clientId !== clientId
        ) {
          console.warn(
            "[admin-section-locks] acquire 200 ok with mismatched holder; treating as locked",
            {
              expectedUserId: currentUserId,
              expectedClientId: clientId,
              holder: json.holder,
            },
          );
          setState({ kind: "locked", holder: json.holder });
          return;
        }
        // Upgrading from locked → owner: the previous holder may have
        // saved newer state in the meantime, so reload to refetch the
        // server-rendered page rather than letting this user edit stale
        // data and overwrite their changes.
        if (prevKind === "locked") {
          doRelease();
          if (typeof window !== "undefined") {
            window.location.reload();
          }
          return;
        }
        setState({ kind: "owner", holder: json.holder });
        startHeartbeat();
        return;
      }
      if (res.status === 409 && json.holder) {
        setState({ kind: "locked", holder: json.holder });
        return;
      }
      setState({
        kind: "error",
        message: json.error ?? `Failed to acquire lock (HTTP ${res.status}).`,
      });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error.",
      });
    }
  }, [apiBase, clientId, currentUserId, doRelease, startHeartbeat]);

  const reconcileViaStatus = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/status`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as {
        ok: boolean;
        holder: AdminSectionLockHolder | null;
      };
      if (!json.holder) {
        const prev = stateRef.current;
        if (prev.kind === "locked") {
          void doAcquire();
        }
        return;
      }
      if (
        json.holder.userId === currentUserId &&
        json.holder.clientId === clientId
      ) {
        setState({ kind: "owner", holder: json.holder });
        return;
      }
      setState({ kind: "locked", holder: json.holder });
    } catch {
      /* swallow */
    }
  }, [apiBase, clientId, currentUserId, doAcquire]);

  // Mount: acquire + register cleanup
  useEffect(() => {
    const acquireTimer = window.setTimeout(() => {
      void doAcquire();
    }, 0);

    // visibilitychange=hidden is intentionally NOT used to release. Tab
    // switching is normal multitasking — the server-side lease reclaims
    // abandoned locks. We only release on genuine page navigation/close.
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void reconcileViaStatus();
        if (stateRef.current.kind === "owner") void doHeartbeat();
      }
    };
    const onPageHide = () => {
      doRelease();
    };
    const onFocus = () => {
      void reconcileViaStatus();
    };

    window.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearTimeout(acquireTimer);
      clearHeartbeat();
      if (lockedPollTimer.current) {
        clearInterval(lockedPollTimer.current);
        lockedPollTimer.current = null;
      }
      window.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("focus", onFocus);
      doRelease();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep stateRef in sync; manage the locked-state poll as a stand-in for
  // a realtime channel so the waiting admin upgrades to editor within ~10s
  // of the current holder leaving.
  useEffect(() => {
    stateRef.current = state;
    if (lockedPollTimer.current) {
      clearInterval(lockedPollTimer.current);
      lockedPollTimer.current = null;
    }
    if (state.kind === "locked") {
      lockedPollTimer.current = setInterval(() => {
        void reconcileViaStatus();
      }, 10_000);
    }
    return () => {
      if (lockedPollTimer.current) {
        clearInterval(lockedPollTimer.current);
        lockedPollTimer.current = null;
      }
    };
  }, [state, reconcileViaStatus]);

  const value = useMemo<LockContextValue>(
    () => ({
      state,
      clientId,
      isEditor: state.kind === "owner",
      isLoading: state.kind === "loading",
    }),
    [state, clientId],
  );

  // Constants references (silences unused warnings if any).
  void LEASE_TTL_SECONDS;
  void TAKEOVER_GRACE_SECONDS;

  return (
    <LockContext.Provider value={value}>
      <AdminSectionLockBanner />
      {children}
    </LockContext.Provider>
  );
}

function AdminSectionLockBanner() {
  const { state } = useAdminSectionLock();
  const { formatTime } = useRegionalSettings();
  if (state.kind === "owner") {
    return (
      <div className="mb-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200">
        Editing — your changes are protected by an edit lock.
      </div>
    );
  }
  if (state.kind === "loading") {
    return (
      <div className="mb-3 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Acquiring edit lock…
      </div>
    );
  }
  if (state.kind === "locked") {
    return (
      <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
        Currently being edited by{" "}
        <strong>{state.holder.userDisplayName}</strong> ({state.holder.userRole}
        ). Last activity {formatTime(state.holder.lastHeartbeatAt)}. You can
        view but not save changes. Another admin is editing — contact them to
        release the lock, or wait until they close the page.
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {state.message}
      </div>
    );
  }
  return null;
}
