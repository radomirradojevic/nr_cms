import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

import {
  checkSubmissionRateLimit,
  getPublishedFormById,
  insertSubmission,
  updateSubmissionEmailStatus,
} from "@/data/forms";
import { buildFormValuesSchema, normalizeValues } from "@/lib/form-validation";
import { getClientIp, hashIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { interpolateTemplate, sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 100 * 1024; // 100KB
const GENERIC_ERROR = "We could not submit your form. Please try again.";

function genericResponse(status: number, message = GENERIC_ERROR) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

async function isSameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("host");
  if (!origin || !host) return false;
  try {
    const u = new URL(origin);
    return u.host === host;
  } catch {
    return false;
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;

    if (!(await isSameOrigin())) {
      return genericResponse(403, "Invalid request origin.");
    }

    const lengthHeader = req.headers.get("content-length");
    if (lengthHeader && Number(lengthHeader) > MAX_BODY) {
      return genericResponse(413, "Payload too large.");
    }
    const text = await req.text();
    if (text.length > MAX_BODY) {
      return genericResponse(413, "Payload too large.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return genericResponse(400, "Malformed request.");
    }
    if (!parsed || typeof parsed !== "object") {
      return genericResponse(400, "Malformed request.");
    }
    const body = parsed as {
      values?: Record<string, unknown>;
      turnstileToken?: string;
    };

    const detail = await getPublishedFormById(id);
    if (!detail) return genericResponse(404, "Form not found.");

    const schema = buildFormValuesSchema(detail.fields);
    const result = schema.safeParse(body.values ?? {});
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const k = String(issue.path[0] ?? "");
        if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      return NextResponse.json(
        { error: "Please fix the highlighted fields.", fieldErrors },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const values = normalizeValues(result.data, detail.fields);

    const ip = await getClientIp();
    const ipHash = hashIp(ip);

    if (detail.settings.enableTurnstile) {
      const tok = body.turnstileToken;
      if (!tok || typeof tok !== "string") {
        return genericResponse(400, "Captcha required.");
      }
      const ok = await verifyTurnstile(tok, ip);
      if (!ok) return genericResponse(400, "Captcha verification failed.");
    }

    const payloadHash = createHash("md5")
      .update(JSON.stringify(values))
      .digest("hex");

    const rl = await checkSubmissionRateLimit({
      formId: id,
      ipHash,
      payloadHash,
    });
    if (!rl.allowed) return genericResponse(429, rl.reason);

    const h = await headers();
    const submission = await insertSubmission({
      formId: id,
      data: values,
      ipHash,
      userAgent: h.get("user-agent")?.slice(0, 500) ?? null,
      referer: h.get("referer")?.slice(0, 500) ?? null,
      submittedBy: null,
    });

    // Best-effort email
    if (detail.settings.enableEmailNotifications) {
      const recipients = Array.isArray(detail.settings.notificationRecipients)
        ? (detail.settings.notificationRecipients as string[])
        : [];
      if (recipients.length > 0) {
        try {
          const text = interpolateTemplate(
            detail.settings.emailTemplate,
            values as Record<string, unknown>,
          );
          let replyTo: string | undefined;
          const replyKey = detail.settings.replyToField;
          if (replyKey && typeof values[replyKey] === "string") {
            const v = (values[replyKey] as string).trim();
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) replyTo = v;
          }
          const sent = await sendEmail({
            to: recipients,
            subject: detail.settings.notificationSubject,
            text,
            replyTo,
          });
          await updateSubmissionEmailStatus(submission.id, {
            status: sent.ok ? "sent" : "failed",
            error: sent.ok ? null : sent.error,
          });
        } catch (err) {
          await updateSubmissionEmailStatus(submission.id, {
            status: "failed",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      } else {
        await updateSubmissionEmailStatus(submission.id, { status: "skipped" });
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: detail.form.successMessage,
        redirectUrl: detail.settings.redirectUrl ?? null,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[forms/submit] error:", err);
    return genericResponse(500);
  }
}
