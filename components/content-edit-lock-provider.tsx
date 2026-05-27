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

import {
  HEARTBEAT_INTERVAL_SECONDS,
  LEASE_TTL_SECONDS,
  TAKEOVER_GRACE_SECONDS,
  type LockHolder,
} from "@/lib/content-locks";
import { hasRole, type Role } from "@/lib/roles";

type LockState =
  | { kind: "loading" }
  | { kind: "owner"; holder: LockHolder; version: number }
  | { kind: "locked"; holder: LockHolder; version: number }
  | { kind: "error"; message: string };

type LockContextValue = {
  state: LockState;
  clientId: string;
  contentVersion: number;
  /** True only when this user actively owns the lock. */
  isEditor: boolean;
  /**
   * True when the current user (admin) is permitted to force-take the lock
   * from the current holder (a non-admin). False otherwise.
   */
  canTakeOver: boolean;
  /** In-flight state for the takeover request, surfaced to the banner. */
  takeoverPending: boolean;
  /** Last takeover error message, if any (e.g. another admin holds it). */
  takeoverError: string | null;
  /** Trigger admin force-takeover. No-op if `canTakeOver` is false. */
  takeOver: () => Promise<void>;
  /**
   * Update the in-memory content version after a successful save by this
   * editor, so the next save sends the up-to-date `expectedVersion` and
   * is not rejected as stale.
   */
  syncVersionAfterSave: (newVersion: number) => void;
};

const LockContext = createContext<LockContextValue | null>(null);

export function useContentEditLock(): LockContextValue {
  const ctx = useContext(LockContext);
  if (!ctx) {
    throw new Error(
      "useContentEditLock must be used inside <ContentEditLockProvider>",
    );
  }
  return ctx;
}

/** Like useContentEditLock but returns null when no provider is mounted. */
export function useContentEditLockOptional(): LockContextValue | null {
  return useContext(LockContext);
}

type ProviderProps = {
  contentId: string;
  initialVersion: number;
  currentUserId: string;
  currentUserRoles: Role[];
  children: ReactNode;
};

function createClientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

/**
 * Wraps the content editor and:
 *   - acquires the edit lock on mount
 *   - heartbeats every HEARTBEAT_INTERVAL_SECONDS while owning the lock
 *   - releases on real navigation (pagehide) and unmount
 *   - polls /status while in `locked` view so the second user can
 *     upgrade to editor as soon as the holder leaves (substitute for a
 *     realtime provider)
 *   - exposes lock state to the editor so it can disable Save when not owner
 *
 * IMPORTANT: switching browser tabs (visibilitychange=hidden) MUST NOT
 * release the lock. Tab-switching is normal multitasking; abandonment is
 * detected by the server-side lease expiring after `LEASE_TTL_SECONDS`.
 */
export function ContentEditLockProvider({
  contentId,
  initialVersion,
  currentUserId,
  currentUserRoles,
  children,
}: ProviderProps) {
  const [clientId] = useState(createClientId);

  const [state, setState] = useState<LockState>({ kind: "loading" });
  const [contentVersion, setContentVersion] = useState<number>(initialVersion);

  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockedPollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  // Latest state, accessible inside event listeners without re-binding them.
  const stateRef = useRef<LockState>({ kind: "loading" });

  const isAdmin = hasRole(currentUserRoles, "admin");
  const [takeoverPending, setTakeoverPending] = useState(false);
  const [takeoverError, setTakeoverError] = useState<string | null>(null);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }, []);

  const doHeartbeat = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/content-locks/${encodeURIComponent(contentId)}/heartbeat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
          credentials: "same-origin",
        },
      );
      if (res.status === 409) {
        // We thought we owned the lock but the server disagrees. This
        // should be extremely rare now that Save no longer releases the
        // lock (the only realistic cause is a long network outage that
        // let our lease expire). We silently downgrade to a read-only
        // view rather than showing a "session timed out" popup. Backend
        // lock validation still prevents any concurrent save.
        clearHeartbeat();
        try {
          const statusRes = await fetch(
            `/api/content-locks/${encodeURIComponent(contentId)}/status`,
            { credentials: "same-origin", cache: "no-store" },
          );
          if (statusRes.ok) {
            const statusJson = (await statusRes.json()) as {
              holder: LockHolder | null;
              contentVersion: number;
            };
            setContentVersion(statusJson.contentVersion);
            if (
              statusJson.holder &&
              !(
                statusJson.holder.userId === currentUserId &&
                statusJson.holder.clientId === clientId
              )
            ) {
              setState({
                kind: "locked",
                holder: statusJson.holder,
                version: statusJson.contentVersion,
              });
              return;
            }
          }
        } catch {
          /* fall through */
        }
        // No other holder — try to silently re-acquire on next tick.
        setState({ kind: "loading" });
        return;
      }
      if (!res.ok) return;
      const json = (await res.json()) as { ok: boolean; holder: LockHolder };
      if (json.ok) {
        setState((prev) =>
          prev.kind === "owner"
            ? { ...prev, holder: json.holder }
            : { kind: "owner", holder: json.holder, version: contentVersion },
        );
      }
    } catch {
      // Network failure — wait for next interval.
    }
  }, [clientId, contentId, contentVersion, currentUserId, clearHeartbeat]);

  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatTimer.current = setInterval(() => {
      void doHeartbeat();
    }, HEARTBEAT_INTERVAL_SECONDS * 1000);
  }, [clearHeartbeat, doHeartbeat]);

  const doRelease = useCallback(() => {
    // Best-effort, fire-and-forget on unmount/navigation.
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      try {
        const blob = new Blob([JSON.stringify({ clientId })], {
          type: "application/json",
        });
        navigator.sendBeacon(
          `/api/content-locks/${encodeURIComponent(contentId)}/release`,
          blob,
        );
        return;
      } catch {
        /* fall through to fetch */
      }
    }
    try {
      void fetch(
        `/api/content-locks/${encodeURIComponent(contentId)}/release`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
          keepalive: true,
          credentials: "same-origin",
        },
      );
    } catch {
      /* swallow */
    }
  }, [clientId, contentId]);

  const doAcquire = useCallback(async () => {
    // IMPORTANT: capture prev kind BEFORE setState("loading") clobbers
    // stateRef during the async gap. We use this below to detect a
    // locked → owner upgrade and force a full-page reload so the editor
    // remounts with fresh content from the DB.
    const prevKind = stateRef.current.kind;
    setState({ kind: "loading" });
    try {
      const res = await fetch(
        `/api/content-locks/${encodeURIComponent(contentId)}/acquire`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
          credentials: "same-origin",
        },
      );
      const json = (await res.json()) as {
        ok: boolean;
        holder?: LockHolder;
        contentVersion?: number;
        error?: string;
      };
      if (res.ok && json.ok && json.holder) {
        // If we are upgrading from a locked state, the form still holds
        // whatever content was loaded the first time the user opened the
        // editor. The previous holder may have saved newer content in the
        // meantime, so we MUST refetch from the server before letting
        // this user edit — otherwise a save would overwrite their
        // changes. Simplest correct fix: hard-reload the page. The fresh
        // page mount will re-acquire the lock cleanly.
        if (prevKind === "locked") {
          // Release this just-acquired lock first so the reload's acquire
          // doesn't conflict with the still-held lease on this clientId.
          // (Server allows the same user/session/client to reclaim, so the
          // post-reload acquire would succeed anyway — but releasing keeps
          // the audit log clean.)
          doRelease();
          if (typeof window !== "undefined") {
            window.location.reload();
          }
          return;
        }
        setContentVersion(json.contentVersion ?? contentVersion);
        setState({
          kind: "owner",
          holder: json.holder,
          version: json.contentVersion ?? contentVersion,
        });
        startHeartbeat();
        return;
      }
      if (res.status === 409 && json.holder) {
        setContentVersion(json.contentVersion ?? contentVersion);
        setState({
          kind: "locked",
          holder: json.holder,
          version: json.contentVersion ?? contentVersion,
        });
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
  }, [clientId, contentId, contentVersion, doRelease, startHeartbeat]);

  const reconcileViaStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/content-locks/${encodeURIComponent(contentId)}/status`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!res.ok) return;
      const json = (await res.json()) as {
        ok: boolean;
        holder: LockHolder | null;
        contentVersion: number;
      };
      setContentVersion(json.contentVersion);
      if (!json.holder) {
        // Lock is free. If we were locked-out, automatically try to grab it.
        // If we thought we owned it, heartbeat will resolve in the next tick.
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
        setState({
          kind: "owner",
          holder: json.holder,
          version: json.contentVersion,
        });
        return;
      }
      // Held by someone else (or another tab of ours). We never show a
      // "kicked" popup — just silently downgrade to read-only view.
      // Backend lock validation prevents any concurrent save.
      setState({
        kind: "locked",
        holder: json.holder,
        version: json.contentVersion,
      });
    } catch {
      /* swallow */
    }
  }, [clientId, contentId, currentUserId, doAcquire]);

  // Mount: acquire + register cleanup
  useEffect(() => {
    const acquireTimer = window.setTimeout(() => {
      void doAcquire();
    }, 0);

    // NOTE: visibilitychange=hidden is intentionally NOT used to release the
    // lock. Switching tabs/windows is normal multitasking — the server-side
    // lease (LEASE_TTL_SECONDS) reclaims abandoned locks. We only release on
    // genuine page navigation/close (pagehide) and on component unmount.
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

    const cleanup = () => {
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
    stopRef.current = cleanup;
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep stateRef in sync and manage the locked-state poll. While the user
  // is locked out we poll /status every 10s as a stand-in for a realtime
  // channel — this lets us upgrade to editor automatically when the holder
  // leaves, and lets us notice an admin takeover within ~10s.
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

  const takeOver = useCallback(async () => {
    if (
      !isAdmin ||
      stateRef.current.kind !== "locked" ||
      stateRef.current.holder.userRole === "admin"
    ) {
      return;
    }
    setTakeoverPending(true);
    setTakeoverError(null);
    try {
      const res = await fetch(
        `/api/content-locks/${encodeURIComponent(contentId)}/takeover`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
          credentials: "same-origin",
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        holder?: LockHolder;
      };
      if (res.ok && json.ok) {
        // Reload so the editor remounts with fresh content from the DB
        // after the previous editor's session is taken over.
        if (typeof window !== "undefined") {
          window.location.reload();
        }
        return;
      }
      if (res.status === 409 && json.error === "ADMIN_HELD") {
        setTakeoverError(
          "Another admin is currently editing this content. Contact them to release the lock.",
        );
      } else {
        setTakeoverError(json.error ?? `Takeover failed (HTTP ${res.status}).`);
      }
    } catch (err) {
      setTakeoverError(
        err instanceof Error ? err.message : "Network error during takeover.",
      );
    } finally {
      setTakeoverPending(false);
    }
  }, [clientId, contentId, isAdmin]);

  const syncVersionAfterSave = useCallback((v: number) => {
    setContentVersion(v);
    setState((prev) =>
      prev.kind === "owner" ? { ...prev, version: v } : prev,
    );
  }, []);

  const value = useMemo<LockContextValue>(
    () => ({
      state,
      clientId,
      contentVersion,
      isEditor: state.kind === "owner",
      canTakeOver:
        isAdmin &&
        state.kind === "locked" &&
        state.holder.userRole !== "admin" &&
        !takeoverPending,
      takeoverPending,
      takeoverError,
      takeOver,
      syncVersionAfterSave,
    }),
    [
      state,
      clientId,
      contentVersion,
      isAdmin,
      takeoverPending,
      takeoverError,
      takeOver,
      syncVersionAfterSave,
    ],
  );

  // Constants reference (silences unused warning in some lint configs).
  void LEASE_TTL_SECONDS;
  void TAKEOVER_GRACE_SECONDS;

  return (
    <LockContext.Provider value={value}>
      <LockBanner />
      {children}
    </LockContext.Provider>
  );
}

function LockBanner() {
  const { state, canTakeOver, takeOver, takeoverPending, takeoverError } =
    useContentEditLock();
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
      <div className="mb-3 flex flex-col gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Currently being edited by{" "}
          <strong>{state.holder.userDisplayName}</strong> (
          {state.holder.userRole}). Last activity{" "}
          {new Date(state.holder.lastHeartbeatAt).toLocaleTimeString()}. You can
          view but not save changes. Wait until the current editor closes the
          page.
          {takeoverError ? (
            <div className="mt-1 text-xs text-destructive">{takeoverError}</div>
          ) : null}
        </div>
        {canTakeOver ? (
          <button
            type="button"
            onClick={() => {
              if (
                typeof window !== "undefined" &&
                !window.confirm(
                  `Force-take editing from ${state.holder.userDisplayName}? Their unsaved changes will be lost.`,
                )
              ) {
                return;
              }
              void takeOver();
            }}
            disabled={takeoverPending}
            className="shrink-0 rounded-md border border-amber-600/60 bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {takeoverPending ? "Taking over…" : "Take over editing session"}
          </button>
        ) : null}
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
