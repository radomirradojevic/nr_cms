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
  type FormLockHolder,
} from "@/lib/form-locks";

type LockState =
  | { kind: "loading" }
  | { kind: "owner"; holder: FormLockHolder }
  | { kind: "locked"; holder: FormLockHolder }
  | { kind: "error"; message: string };

type LockContextValue = {
  state: LockState;
  status: LockState["kind"];
  holder: FormLockHolder | null;
  clientId: string;
  isEditor: boolean;
  isLoading: boolean;
};

const LockContext = createContext<LockContextValue | null>(null);

export function useFormEditLock(): LockContextValue {
  const ctx = useContext(LockContext);
  if (!ctx) {
    throw new Error(
      "useFormEditLock must be used inside <FormEditLockProvider>",
    );
  }
  return ctx;
}

export function useFormEditLockOptional(): LockContextValue | null {
  return useContext(LockContext);
}

type ProviderProps = {
  formId: string;
  currentUserId: string;
  children: ReactNode;
};

export function FormEditLockProvider({
  formId,
  currentUserId,
  children,
}: ProviderProps) {
  const [clientId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `c_${Math.random().toString(36).slice(2)}_${Date.now()}`,
  );

  const [state, setState] = useState<LockState>({ kind: "loading" });
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockedPollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef<LockState>({ kind: "loading" });

  const apiBase = `/api/form-locks/${encodeURIComponent(formId)}`;

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
              holder: FormLockHolder | null;
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
        holder: FormLockHolder;
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
        holder?: FormLockHolder;
        error?: string;
      };
      if (res.ok && json.ok && json.holder) {
        if (
          json.holder.userId !== currentUserId ||
          json.holder.clientId !== clientId
        ) {
          console.warn(
            "[form-locks] acquire 200 ok with mismatched holder; treating as locked",
            {
              expectedUserId: currentUserId,
              expectedClientId: clientId,
              holder: json.holder,
            },
          );
          setState({ kind: "locked", holder: json.holder });
          return;
        }
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
        holder: FormLockHolder | null;
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

  useEffect(() => {
    const acquireTimer = window.setTimeout(() => {
      void doAcquire();
    }, 0);

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

  const value = useMemo<LockContextValue>(() => {
    const holder =
      state.kind === "owner" || state.kind === "locked" ? state.holder : null;
    return {
      state,
      status: state.kind,
      holder,
      clientId,
      isEditor: state.kind === "owner",
      isLoading: state.kind === "loading",
    };
  }, [state, clientId]);

  void LEASE_TTL_SECONDS;
  void TAKEOVER_GRACE_SECONDS;

  return (
    <LockContext.Provider value={value}>
      <FormEditLockBanner />
      {children}
    </LockContext.Provider>
  );
}

function FormEditLockBanner() {
  const { state } = useFormEditLock();
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
        Acquiring edit lock...
      </div>
    );
  }
  if (state.kind === "locked") {
    return (
      <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
        Currently being edited by{" "}
        <strong>{state.holder.userDisplayName}</strong> ({state.holder.userRole}
        ). Last activity{" "}
        {new Date(state.holder.lastHeartbeatAt).toLocaleTimeString()}. You can
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
