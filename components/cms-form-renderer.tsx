"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { CmsFormField, type FieldValue } from "./cms-form-field";
import type { FormDetail, FormFieldRow } from "@/lib/form-types";

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

export type CmsFormRendererProps = {
  form: FormDetail;
};

function initialValueFor(f: FormFieldRow): FieldValue {
  if (f.fieldType === "checkbox") {
    const opts = (f.options ?? {}) as {
      choices?: { value: string; label: string }[];
    };
    return Array.isArray(opts.choices) && opts.choices.length > 0 ? [] : false;
  }
  return "";
}

export function CmsFormRenderer({ form }: CmsFormRendererProps) {
  const titleId = useId();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, FieldValue>>(() => {
    const out: Record<string, FieldValue> = {};
    for (const f of form.fields) out[f.fieldKey] = initialValueFor(f);
    return out;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [uploadingFor, setUploadingFor] = useState<Set<string>>(new Set());

  const enableTurnstile = form.settings.enableTurnstile;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const widgetIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Defer loading the Cloudflare Turnstile script + widget until the user
  // interacts with the form. Keeps the host page console / network clean for
  // visitors who never engage with the form.
  const [armed, setArmed] = useState(false);
  const arm = () => setArmed(true);

  const visibleFields = useMemo(
    () => [...form.fields].sort((a, b) => a.position - b.position),
    [form.fields],
  );

  useEffect(() => {
    if (!enableTurnstile || !armed) return;
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
  }, [enableTurnstile, siteKey, armed]);

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

  function setValue(key: string, v: FieldValue) {
    setValues((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const { [key]: _omit, ...rest } = prev;
      void _omit;
      return rest;
    });
  }

  async function handleFileSelect(field: FormFieldRow, file: File) {
    setUploadingFor((s) => new Set(s).add(field.fieldKey));
    setErrors((prev) => {
      if (!prev[field.fieldKey]) return prev;
      const { [field.fieldKey]: _omit, ...rest } = prev;
      void _omit;
      return rest;
    });
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("fieldKey", field.fieldKey);
      if (token) fd.append("turnstileToken", token);
      const res = await fetch(`/api/forms/${form.form.id}/upload`, {
        method: "POST",
        body: fd,
        cache: "no-store",
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok || !data || typeof data !== "object" || !("fileId" in data)) {
        const msg =
          data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : "Upload failed.";
        setErrors((p) => ({ ...p, [field.fieldKey]: msg }));
        return;
      }
      const d = data as {
        fileId: string;
        originalName: string;
        mime: string;
        size: number;
      };
      setValue(field.fieldKey, {
        fileId: d.fileId,
        originalName: d.originalName,
        mime: d.mime,
        size: d.size,
      });
    } catch {
      setErrors((p) => ({ ...p, [field.fieldKey]: "Upload failed." }));
    } finally {
      setUploadingFor((s) => {
        const next = new Set(s);
        next.delete(field.fieldKey);
        return next;
      });
    }
  }

  function validateRequired(): Record<string, string> {
    const errs: Record<string, string> = {};
    for (const f of visibleFields) {
      if (!f.required) continue;
      const v = values[f.fieldKey];
      const opts = (f.options ?? {}) as {
        choices?: { value: string; label: string }[];
      };
      if (
        f.fieldType === "text" ||
        f.fieldType === "textarea" ||
        f.fieldType === "email" ||
        f.fieldType === "phone" ||
        f.fieldType === "date" ||
        f.fieldType === "select" ||
        f.fieldType === "radio"
      ) {
        if (!v || (typeof v === "string" && v.trim() === "")) {
          errs[f.fieldKey] = "This field is required.";
        }
      } else if (f.fieldType === "number") {
        if (v === "" || v === null || v === undefined) {
          errs[f.fieldKey] = "This field is required.";
        }
      } else if (f.fieldType === "checkbox") {
        if (Array.isArray(opts.choices) && opts.choices.length > 0) {
          if (!Array.isArray(v) || (v as string[]).length === 0) {
            errs[f.fieldKey] = "This field is required.";
          }
        } else if (!v) {
          errs[f.fieldKey] = "This field is required.";
        }
      } else if (f.fieldType === "file") {
        if (!v || typeof v !== "object") {
          errs[f.fieldKey] = "This field is required.";
        }
      }
    }
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (enableTurnstile && !armed) setArmed(true);
    setTopError(null);
    setErrors({});
    const fieldErrs = validateRequired();
    if (Object.keys(fieldErrs).length > 0) {
      setErrors(fieldErrs);
      setTopError("Please fill in all required fields.");
      return;
    }
    if (enableTurnstile && !token) {
      setTopError("Please complete the captcha.");
      return;
    }
    if (uploadingFor.size > 0) {
      setTopError("Please wait for file uploads to finish.");
      return;
    }
    const payload = {
      values,
      turnstileToken: enableTurnstile ? token : undefined,
    };
    startTransition(async () => {
      try {
        const res = await fetch(`/api/forms/${form.form.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
        });
        const data: unknown = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (
            data &&
            typeof data === "object" &&
            "fieldErrors" in data &&
            data.fieldErrors &&
            typeof data.fieldErrors === "object"
          ) {
            setErrors(data.fieldErrors as Record<string, string>);
          }
          const msg =
            data && typeof data === "object" && "error" in data
              ? String((data as { error: unknown }).error)
              : "Submission failed. Please try again.";
          setTopError(msg);
          resetWidget();
          return;
        }
        const ok = data as {
          success?: boolean;
          message?: string;
          redirectUrl?: string | null;
        };
        if (ok.redirectUrl) {
          window.location.assign(ok.redirectUrl);
          return;
        }
        setSuccess(ok.message ?? form.form.successMessage);
        // Reset values
        const fresh: Record<string, FieldValue> = {};
        for (const f of form.fields) fresh[f.fieldKey] = initialValueFor(f);
        setValues(fresh);
        resetWidget();
      } catch {
        setTopError("Submission failed. Please try again.");
        resetWidget();
      }
    });
  }

  if (success) {
    return (
      <div
        className="rounded-lg border bg-muted/30 p-4 text-sm"
        role="status"
        aria-live="polite"
      >
        {success}
      </div>
    );
  }

  return (
    <>
      {enableTurnstile && siteKey && armed && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
        />
      )}
      <form
        onSubmit={handleSubmit}
        onFocusCapture={enableTurnstile ? arm : undefined}
        onPointerDownCapture={enableTurnstile ? arm : undefined}
        className="space-y-4 rounded-lg border p-4"
        aria-labelledby={titleId}
        noValidate
      >
        <h3 id={titleId} className="sr-only">
          {form.form.name}
        </h3>
        {visibleFields.map((f) => (
          <CmsFormField
            key={f.id}
            field={f}
            value={values[f.fieldKey] ?? null}
            onChange={(v) => setValue(f.fieldKey, v)}
            onFileSelect={(file) => handleFileSelect(f, file)}
            error={errors[f.fieldKey]}
            disabled={pending || uploadingFor.has(f.fieldKey)}
          />
        ))}
        {enableTurnstile && (
          <div ref={containerRef} className={armed ? undefined : "hidden"} />
        )}
        {topError && (
          <p className="text-sm text-destructive" role="alert">
            {topError}
          </p>
        )}
        <Button type="submit" disabled={pending || uploadingFor.size > 0}>
          {pending ? "Submitting…" : form.form.submitLabel}
        </Button>
      </form>
    </>
  );
}
