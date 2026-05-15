"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Script from "next/script";
import { SignInButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitComment } from "@/app/dashboard/content/comment-actions";

type Props = {
  contentId: string;
  postSlug: string;
  allowAnonymous: boolean;
  parentId?: string | null;
  onCancel?: () => void;
  onSubmitted?: (msg: string) => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

const MAX_LEN = 5000;

export function BlogCommentForm({
  contentId,
  postSlug,
  allowAnonymous,
  parentId = null,
  onCancel,
  onSubmitted,
}: Props) {
  const { isLoaded, isSignedIn } = useUser();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const widgetIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerId = useId();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Mount the Turnstile widget once the script has loaded.
  useEffect(() => {
    function tryRender() {
      if (
        !siteKey ||
        widgetIdRef.current ||
        !containerRef.current ||
        !window.turnstile
      ) {
        return false;
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "auto",
        callback: (t) => setToken(t),
        "expired-callback": () => setToken(""),
        "error-callback": () => setToken(""),
      });
      return true;
    }
    if (!tryRender()) {
      const interval = setInterval(() => {
        if (tryRender()) clearInterval(interval);
      }, 200);
      return () => clearInterval(interval);
    }
    return () => {
      try {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
        }
      } catch {
        /* noop */
      }
      widgetIdRef.current = null;
    };
  }, [siteKey]);

  if (!isLoaded) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!isSignedIn && !allowAnonymous) {
    return (
      <div className="rounded-lg border p-4 text-sm">
        <p className="mb-2">You must be signed in to comment.</p>
        <SignInButton mode="modal">
          <Button size="sm">Sign in to comment</Button>
        </SignInButton>
      </div>
    );
  }

  function resetWidget() {
    setToken("");
    try {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    } catch {
      /* noop */
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    const trimmed = body.trim();
    if (trimmed.length === 0) return setError("Comment cannot be empty.");
    if (trimmed.length > MAX_LEN)
      return setError(`Comment too long (max ${MAX_LEN} characters).`);
    if (!isSignedIn) {
      if (!guestName.trim()) return setError("Name is required.");
    }
    if (!token) return setError("Please complete the captcha.");

    startTransition(async () => {
      const r = await submitComment({
        contentId,
        parentId: parentId ?? null,
        body: trimmed,
        guestName: !isSignedIn ? guestName.trim() : undefined,
        guestEmail: !isSignedIn ? guestEmail.trim() || undefined : undefined,
        turnstileToken: token,
      });
      if ("error" in r) {
        setError(r.error);
        resetWidget();
        return;
      }
      setBody("");
      setGuestName("");
      setGuestEmail("");
      const successMsg =
        r.status === "published"
          ? "Your comment has been posted."
          : "Your comment has been submitted and is awaiting moderation.";
      resetWidget();
      if (onSubmitted) {
        onSubmitted(successMsg);
      } else {
        setOkMsg(successMsg);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border p-4"
      aria-labelledby={containerId + "-title"}
    >
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
      />
      <h3 id={containerId + "-title"} className="text-sm font-semibold">
        {parentId ? "Reply" : "Leave a comment"}
      </h3>

      {!isSignedIn && allowAnonymous && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`${containerId}-name`}>Name *</Label>
            <Input
              id={`${containerId}-name`}
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              maxLength={120}
              required
              autoComplete="name"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${containerId}-email`}>Email (optional)</Label>
            <Input
              id={`${containerId}-email`}
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              maxLength={254}
              autoComplete="email"
            />
            <p className="text-xs text-muted-foreground">Not shown publicly.</p>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor={`${containerId}-body`}>Comment *</Label>
        <Textarea
          id={`${containerId}-body`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={MAX_LEN}
          required
          placeholder="Share your thoughts…"
        />
        <p className="text-xs text-muted-foreground">
          {body.length}/{MAX_LEN}
        </p>
      </div>

      {siteKey ? (
        <div ref={containerRef} />
      ) : (
        <p className="text-xs text-destructive">
          Captcha is not configured. Set NEXT_PUBLIC_TURNSTILE_SITE_KEY.
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {okMsg && (
        <p className="text-sm text-emerald-500" role="status">
          {okMsg}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending || !token || !siteKey}>
          {pending ? "Submitting…" : parentId ? "Post reply" : "Post comment"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Use the postSlug for client routing/anchors if needed */}
      <input type="hidden" value={postSlug} readOnly hidden />
    </form>
  );
}
