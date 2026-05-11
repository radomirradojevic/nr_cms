import "server-only";
import { z } from "zod";

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  mime: string;
};

export type EmailInput = {
  to: string[];
  subject: string;
  text: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
};

export type SendResult = { ok: true } | { ok: false; error: string };

const emailListSchema = z.array(z.string().email()).min(1).max(10);

/**
 * Provider-agnostic email sender. Reads provider + credentials from env vars
 * only (never from DB). Supports `resend` (default) and `smtp` (nodemailer)
 * — only loads the underlying library when actually used.
 *
 * On any failure returns `{ ok: false, error }` so callers can persist the
 * error and decide whether to fail the request (callers should NOT fail the
 * user-facing request on email errors).
 */
export async function sendEmail(input: EmailInput): Promise<SendResult> {
  const toParsed = emailListSchema.safeParse(input.to);
  if (!toParsed.success) {
    return { ok: false, error: "Invalid recipient list." };
  }
  if (input.replyTo) {
    const r = z.string().email().safeParse(input.replyTo);
    if (!r.success) return { ok: false, error: "Invalid reply-to address." };
  }
  const from = process.env.EMAIL_FROM;
  if (!from) {
    return { ok: false, error: "EMAIL_FROM is not configured." };
  }

  const provider = (process.env.EMAIL_PROVIDER ?? "resend").toLowerCase();

  try {
    if (provider === "smtp") {
      return await sendViaSmtp(input, from);
    }
    return await sendViaResend(input, from);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown email error.",
    };
  }
}

async function sendViaResend(
  input: EmailInput,
  from: string,
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not set." };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      reply_to: input.replyTo,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content.toString("base64"),
      })),
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      ok: false,
      error: `Resend error ${res.status}: ${body.slice(0, 200)}`,
    };
  }
  return { ok: true };
}

async function sendViaSmtp(
  input: EmailInput,
  from: string,
): Promise<SendResult> {
  const host = process.env.SMTP_HOST;
  const portStr = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = (process.env.SMTP_SECURE ?? "true") === "true";
  if (!host || !portStr) {
    return { ok: false, error: "SMTP_HOST/SMTP_PORT not configured." };
  }
  type NodemailerLike = {
    createTransport: (opts: unknown) => {
      sendMail: (msg: {
        from: string;
        to: string;
        subject: string;
        text: string;
        replyTo?: string;
        attachments?: {
          filename: string;
          content: Buffer;
          contentType: string;
        }[];
      }) => Promise<unknown>;
    };
  };
  let nodemailer: NodemailerLike;
  try {
    // Optional dep — only required when EMAIL_PROVIDER=smtp. We use an
    // `eval`-ed `require` so bundlers (Next.js / Turbopack) don't try to
    // resolve `nodemailer` at build time when it isn't installed.
    const dynamicRequire = eval("require") as NodeJS.Require;
    nodemailer = dynamicRequire("nodemailer") as NodemailerLike;
  } catch {
    return {
      ok: false,
      error: "nodemailer is not installed. Run `npm i nodemailer` to use SMTP.",
    };
  }
  const transporter = nodemailer.createTransport({
    host,
    port: Number(portStr),
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
  await transporter.sendMail({
    from,
    to: input.to.join(", "),
    subject: input.subject,
    text: input.text,
    replyTo: input.replyTo,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.mime,
    })),
  });
  return { ok: true };
}

/**
 * Render an email body by replacing `{{token}}` placeholders with values.
 * Values are interpolated as PLAIN TEXT — no HTML, no template execution.
 * Unknown tokens are left in place so they're visible during debugging.
 */
export function interpolateTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key)
      ? values[key]
      : `{{${key}}}`,
  );
}
