"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PADDLE_SCRIPT_ID = "paddle-js-v2";
const PADDLE_SCRIPT_SRC = "https://cdn.paddle.com/paddle/v2/paddle.js";
const PADDLE_FRAME_TARGET = "paddle-checkout-frame";

type PaddleCheckoutClientProps = {
  cancelUrl: string;
  clientToken: string;
  mode: "live" | "test";
  successUrl: string;
  transactionId: string | null;
};

type PaddleEvent = {
  name?: string;
};

type PaddleWindow = Window & {
  Paddle?: {
    Checkout: {
      open: (input: {
        settings?: {
          displayMode?: "inline";
          frameInitialHeight?: string;
          frameStyle?: string;
          frameTarget?: string;
          successUrl?: string;
        };
        transactionId: string;
      }) => void;
    };
    Environment?: {
      set: (environment: "sandbox") => void;
    };
    Initialize: (input: {
      eventCallback?: (event: PaddleEvent) => void;
      token: string;
    }) => void;
  };
};

export function PaddleCheckoutClient({
  cancelUrl,
  clientToken,
  mode,
  successUrl,
  transactionId,
}: PaddleCheckoutClientProps) {
  const initializedRef = useRef(false);
  const autoOpenedRef = useRef(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [status, setStatus] = useState<
    "error" | "loaded" | "loading" | "opening"
  >("loading");
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const setupError = useMemo(() => {
    if (!transactionId) return "Paddle transaction was not provided.";
    if (!clientToken) return "Paddle client-side token is not configured.";
    return null;
  }, [clientToken, transactionId]);

  const openCheckout = useCallback(() => {
    if (setupError || !transactionId || !clientToken) {
      setStatus("error");
      setError(setupError ?? "Paddle checkout is not configured.");
      return;
    }

    const paddle = (window as PaddleWindow).Paddle;
    if (!paddle) {
      setStatus("error");
      setError(
        "Paddle.js is not available. Refresh the page after the server restarts.",
      );
      return;
    }

    try {
      if (!initializedRef.current) {
        if (mode === "test") paddle.Environment?.set("sandbox");
        paddle.Initialize({
          eventCallback(event) {
            if (event.name) setLastEvent(event.name);
            if (event.name === "checkout.loaded") {
              setStatus("loaded");
              setError(null);
              return;
            }
            if (event.name === "checkout.completed") {
              window.location.assign(successUrl);
              return;
            }
            if (
              event.name === "checkout.error" ||
              event.name === "checkout.payment.failed"
            ) {
              setStatus("error");
              setError("Paddle checkout reported an error.");
            }
          },
          token: clientToken,
        });
        initializedRef.current = true;
      }

      setStatus("opening");
      setError(null);
      paddle.Checkout.open({
        settings: {
          displayMode: "inline",
          frameInitialHeight: "620",
          frameStyle:
            "width:100%;min-width:312px;background-color:transparent;border:none;",
          frameTarget: PADDLE_FRAME_TARGET,
          successUrl,
        },
        transactionId,
      });
    } catch {
      setStatus("error");
      setError("Paddle checkout could not be opened.");
    }
  }, [clientToken, mode, setupError, successUrl, transactionId]);

  const openCheckoutOnce = useCallback(() => {
    setScriptReady(true);
    if (autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    openCheckout();
  }, [openCheckout]);

  useEffect(() => {
    let cancelled = false;
    let pollId: number | null = null;
    let timeoutId: number | null = null;
    let script: HTMLScriptElement | null = null;

    const cleanupTimers = () => {
      if (pollId !== null) window.clearInterval(pollId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      pollId = null;
      timeoutId = null;
    };

    const handleReady = () => {
      if (cancelled) return;
      script?.setAttribute("data-loaded", "true");
      cleanupTimers();
      openCheckoutOnce();
    };

    const handleError = () => {
      if (cancelled) return;
      cleanupTimers();
      setStatus("error");
      setError("Paddle.js could not be loaded.");
    };

    const checkReady = () => {
      if ((window as PaddleWindow).Paddle) handleReady();
    };

    if ((window as PaddleWindow).Paddle) {
      window.setTimeout(handleReady, 0);
      return;
    }

    script = document.getElementById(
      PADDLE_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (script?.dataset.loaded === "true") {
      window.setTimeout(handleReady, 0);
      return;
    }

    if (!script) {
      script = document.createElement("script");
      script.id = PADDLE_SCRIPT_ID;
      script.async = true;
    }

    script.addEventListener("load", handleReady);
    script.addEventListener("error", handleError);
    pollId = window.setInterval(checkReady, 100);
    timeoutId = window.setTimeout(() => {
      if (!(window as PaddleWindow).Paddle) {
        handleError();
      }
    }, 10000);

    if (!script.src) {
      script.src = PADDLE_SCRIPT_SRC;
    }
    if (!script.isConnected) {
      document.head.appendChild(script);
    }
    checkReady();

    return () => {
      cancelled = true;
      cleanupTimers();
      script?.removeEventListener("load", handleReady);
      script?.removeEventListener("error", handleError);
    };
  }, [openCheckoutOnce]);

  const statusText =
    status === "loaded"
      ? "Complete the payment below."
      : status === "opening"
        ? "Opening Paddle checkout..."
        : status === "error"
          ? (error ?? "Paddle checkout is unavailable.")
          : scriptReady
            ? "Preparing Paddle checkout..."
            : "Loading Paddle.js...";

  return (
    <main className="min-h-[70vh] bg-background px-4 py-12 text-foreground">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Paddle Checkout
          </p>
          <h1 className="text-2xl font-semibold tracking-normal">
            Secure payment
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {statusText}
          </p>
          {lastEvent ? (
            <p className="text-xs text-muted-foreground">
              Last Paddle event: {lastEvent}
            </p>
          ) : null}
        </div>

        <div
          className={`${PADDLE_FRAME_TARGET} min-h-[620px] w-full overflow-hidden rounded-md border bg-background`}
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={openCheckout}
            disabled={Boolean(setupError)}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reload checkout
          </button>
          <a
            href={cancelUrl}
            className="inline-flex min-h-11 items-center justify-center rounded-md border px-4 text-sm font-medium transition hover:bg-muted"
          >
            Back to order
          </a>
        </div>
      </section>
    </main>
  );
}
