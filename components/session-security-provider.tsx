"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, useClerk, useSession } from "@clerk/nextjs";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SessionSecurityProviderProps {
  maxSessionDurationMinutes: number;
  idleLogoutMinutes: number;
  children: React.ReactNode;
}

const ABSOLUTE_KEY = "nr_cms.session.absoluteDeadline";
const IDLE_KEY = "nr_cms.session.idleDeadline";
const ACTIVITY_THROTTLE_MS = 5_000;
const TICK_MS = 1_000;

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "click",
  "scroll",
  "touchstart",
] as const;

function safeGetNumber(key: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function safeSetNumber(key: string, value: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, String(Math.floor(value)));
  } catch {
    // ignore quota / private-mode errors
  }
}

function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function formatMmSs(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function SessionSecurityProvider({
  maxSessionDurationMinutes,
  idleLogoutMinutes,
  children,
}: SessionSecurityProviderProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { session } = useSession();
  const { signOut } = useClerk();

  if (!isLoaded || !isSignedIn || !session) {
    return <>{children}</>;
  }

  return (
    <>
      <SessionSecurityTimers
        maxSessionDurationMinutes={maxSessionDurationMinutes}
        idleLogoutMinutes={idleLogoutMinutes}
        signInAtMs={
          session.lastActiveAt?.getTime() ?? session.createdAt?.getTime()
        }
        onSignOut={() =>
          signOut({ redirectUrl: "/" }).catch(() => {
            /* noop */
          })
        }
      />
      {children}
    </>
  );
}

interface TimersProps {
  maxSessionDurationMinutes: number;
  idleLogoutMinutes: number;
  signInAtMs?: number;
  onSignOut: () => void;
}

function SessionSecurityTimers({
  maxSessionDurationMinutes,
  idleLogoutMinutes,
  signInAtMs,
  onSignOut,
}: TimersProps) {
  const idleMs = idleLogoutMinutes * 60_000;
  const maxMs = maxSessionDurationMinutes * 60_000;
  const warningLeadMs = Math.min(60_000, Math.floor(idleMs / 4));

  const [now, setNow] = useState<number>(() => Date.now());
  const [fallbackSignInAtMs] = useState<number>(() => Date.now());
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningKind, setWarningKind] = useState<"idle" | "absolute">("idle");

  const lastActivityWriteRef = useRef<number>(0);
  const signedOutRef = useRef<boolean>(false);

  const performSignOut = useCallback(() => {
    if (signedOutRef.current) return;
    signedOutRef.current = true;
    safeRemove(ABSOLUTE_KEY);
    safeRemove(IDLE_KEY);
    onSignOut();
  }, [onSignOut]);

  const effectiveSignInAtMs = signInAtMs ?? fallbackSignInAtMs;

  const resetIdle = useCallback(() => {
    const next = Date.now() + idleMs;
    safeSetNumber(IDLE_KEY, next);
    setWarningOpen(false);
  }, [idleMs]);

  // ─── Initialize / clamp deadlines on mount + when settings change ─────────
  useEffect(() => {
    if (signedOutRef.current) return;
    const nowMs = Date.now();

    // Absolute: persist if missing, clamp to min(existing, signInAt+max).
    const existingAbs = safeGetNumber(ABSOLUTE_KEY);
    const computedAbs = effectiveSignInAtMs + maxMs;
    const nextAbs =
      existingAbs === null ? computedAbs : Math.min(existingAbs, computedAbs);
    safeSetNumber(ABSOLUTE_KEY, nextAbs);

    if (nowMs >= nextAbs) {
      performSignOut();
      return;
    }

    // Idle: reset to now+idleMs on mount or when idleMs grows; keep existing
    // when it's still in the future and shorter than the new max.
    const existingIdle = safeGetNumber(IDLE_KEY);
    if (existingIdle === null || existingIdle <= nowMs) {
      safeSetNumber(IDLE_KEY, nowMs + idleMs);
    } else {
      // Re-clamp to the new idle window if it shrank.
      safeSetNumber(IDLE_KEY, Math.min(existingIdle, nowMs + idleMs));
    }
  }, [idleMs, maxMs, effectiveSignInAtMs, performSignOut]);

  // ─── Activity listeners (throttled) ───────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onActivity = () => {
      if (signedOutRef.current) return;
      const nowMs = Date.now();
      if (nowMs - lastActivityWriteRef.current < ACTIVITY_THROTTLE_MS) return;
      lastActivityWriteRef.current = nowMs;
      safeSetNumber(IDLE_KEY, nowMs + idleMs);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") onActivity();
    };

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility, {
      passive: true,
    });

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [idleMs]);

  // ─── Cross-tab sync ───────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== IDLE_KEY && e.key !== ABSOLUTE_KEY) return;
      // If another tab cleared the keys (sign-out), mirror that here.
      if (e.key === ABSOLUTE_KEY && e.newValue === null) {
        performSignOut();
        return;
      }
      // Force a tick update so countdown/state reflects the new deadline.
      setNow(Date.now());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [performSignOut]);

  // ─── 1s tick: check deadlines + drive countdown UI ────────────────────────
  useEffect(() => {
    const id = window.setInterval(() => {
      if (signedOutRef.current) return;
      const nowMs = Date.now();
      setNow(nowMs);

      const abs = safeGetNumber(ABSOLUTE_KEY);
      const idle = safeGetNumber(IDLE_KEY);

      if (abs !== null && nowMs >= abs) {
        performSignOut();
        return;
      }
      if (idle !== null && nowMs >= idle) {
        performSignOut();
        return;
      }

      const nextAbs = abs ?? Number.POSITIVE_INFINITY;
      const nextIdle = idle ?? Number.POSITIVE_INFINITY;
      const which: "idle" | "absolute" =
        nextAbs <= nextIdle ? "absolute" : "idle";
      const remaining = Math.min(nextAbs, nextIdle) - nowMs;

      if (remaining <= warningLeadMs) {
        setWarningKind(which);
        setWarningOpen(true);
      } else {
        setWarningOpen((prev) => (prev ? false : prev));
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [performSignOut, warningLeadMs]);

  // ─── Render warning dialog ────────────────────────────────────────────────
  const abs = safeGetNumber(ABSOLUTE_KEY) ?? Number.POSITIVE_INFINITY;
  const idle = safeGetNumber(IDLE_KEY) ?? Number.POSITIVE_INFINITY;
  const deadline = Math.min(abs, idle);
  const remainingSec = Math.max(0, Math.ceil((deadline - now) / 1000));
  const isAbsolute = warningKind === "absolute";

  return (
    <AlertDialog open={warningOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You will be signed out</AlertDialogTitle>
          <AlertDialogDescription>
            {isAbsolute
              ? "Your session has reached its maximum duration."
              : "You have been inactive."}{" "}
            You will be signed out in{" "}
            <span className="font-mono font-medium">
              {formatMmSs(remainingSec)}
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {!isAbsolute && (
            <AlertDialogAction onClick={resetIdle}>
              Stay signed in
            </AlertDialogAction>
          )}
          <AlertDialogCancel onClick={performSignOut}>
            Sign out now
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
