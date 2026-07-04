"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useFormEditLock } from "@/components/form-edit-lock-provider";
import { HelpInfo } from "@/components/ui/help-info";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormFieldRow, FormSettingsRow } from "@/lib/form-types";
import { saveFormSettings } from "../actions";

const NONE = "__none__";

type Props = {
  formId: string;
  initialSettings: FormSettingsRow;
  fields: FormFieldRow[];
};

function LabelWithHelp({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <HelpInfo title={label}>{children}</HelpInfo>
    </div>
  );
}

export function FormSettingsForm({ formId, initialSettings, fields }: Props) {
  const router = useRouter();
  const lock = useFormEditLock();
  const [busy, startSave] = useTransition();
  const [enableEmail, setEnableEmail] = useState(
    initialSettings.enableEmailNotifications,
  );
  const [recipients, setRecipients] = useState<string[]>(() => {
    const r = initialSettings.notificationRecipients;
    return Array.isArray(r) ? (r as string[]) : [];
  });
  const [newRecipient, setNewRecipient] = useState("");
  const [subject, setSubject] = useState(initialSettings.notificationSubject);
  const [replyToField, setReplyToField] = useState<string>(
    initialSettings.replyToField ?? NONE,
  );
  const [template, setTemplate] = useState(initialSettings.emailTemplate);
  const [redirectUrl, setRedirectUrl] = useState(
    initialSettings.redirectUrl ?? "",
  );
  const [enableTurnstile, setEnableTurnstile] = useState(
    initialSettings.enableTurnstile,
  );

  const emailFields = fields.filter((f) => f.fieldType === "email");

  function addRecipient() {
    const v = newRecipient.trim().toLowerCase();
    if (!v) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      toast.error("Invalid email.");
      return;
    }
    if (recipients.includes(v)) {
      setNewRecipient("");
      return;
    }
    if (recipients.length >= 10) {
      toast.error("Maximum 10 recipients.");
      return;
    }
    setRecipients([...recipients, v]);
    setNewRecipient("");
  }

  function save() {
    if (enableEmail && recipients.length === 0) {
      toast.error("Add at least one recipient or disable notifications.");
      return;
    }
    startSave(async () => {
      const res = await saveFormSettings({
        formId,
        lockClientId: lock.clientId,
        enableEmailNotifications: enableEmail,
        notificationRecipients: recipients,
        notificationSubject: subject.trim() || "New form submission",
        replyToField: replyToField === NONE ? null : replyToField,
        emailTemplate: template,
        redirectUrl: redirectUrl.trim() || null,
        enableTurnstile,
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Settings saved.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-3 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <div>
            <LabelWithHelp label="Spam protection">
              Require Cloudflare Turnstile on the public form.
            </LabelWithHelp>
          </div>
          <Switch
            checked={enableTurnstile}
            onCheckedChange={setEnableTurnstile}
            disabled={!lock.isEditor}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <div>
            <LabelWithHelp label="Email notifications">
              Send an email to one or more recipients on every new submission.
            </LabelWithHelp>
          </div>
          <Switch
            checked={enableEmail}
            onCheckedChange={setEnableEmail}
            disabled={!lock.isEditor}
          />
        </div>

        {enableEmail && (
          <>
            <div className="rounded-md border border-amber-500/40 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-medium">Sender configuration required</p>
              <p className="mt-1">
                Emails are sent using credentials from environment variables
                (set in <code>.env</code> and restart the dev server). Provider
                is selected by <code>EMAIL_PROVIDER</code>.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>
                  <strong>Resend</strong> (default): set{" "}
                  <code>EMAIL_PROVIDER=resend</code>,{" "}
                  <code>RESEND_API_KEY</code>, and <code>EMAIL_FROM</code> (must
                  be a verified sender/domain in Resend).
                </li>
                <li>
                  <strong>SMTP</strong>: set <code>EMAIL_PROVIDER=smtp</code>,{" "}
                  <code>SMTP_HOST</code>, <code>SMTP_PORT</code>,{" "}
                  <code>SMTP_USER</code>, <code>SMTP_PASS</code>,{" "}
                  <code>SMTP_SECURE</code>, and <code>EMAIL_FROM</code>.
                  Requires <code>npm i nodemailer</code>.
                </li>
              </ul>
              <div className="mt-3 space-y-2">
                <p className="font-medium">
                  Example <code>.env</code> entries:
                </p>
                <div>
                  <p className="mb-1 text-amber-700 dark:text-amber-300">
                    Resend:
                  </p>
                  <pre className="overflow-x-auto rounded bg-amber-100 p-2 font-mono text-[11px] leading-relaxed dark:bg-amber-900/40">{`EMAIL_PROVIDER=resend\nRESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx\nEMAIL_FROM=noreply@yourdomain.com`}</pre>
                </div>
                <div>
                  <p className="mb-1 text-amber-700 dark:text-amber-300">
                    SMTP (e.g. Gmail):
                  </p>
                  <pre className="overflow-x-auto rounded bg-amber-100 p-2 font-mono text-[11px] leading-relaxed dark:bg-amber-900/40">{`EMAIL_PROVIDER=smtp\nSMTP_HOST=smtp.gmail.com\nSMTP_PORT=465\nSMTP_USER=you@gmail.com\nSMTP_PASS=your-app-password\nSMTP_SECURE=true\nEMAIL_FROM=you@gmail.com`}</pre>
                </div>
              </div>
              <p className="mt-2">
                Submissions are always saved. If sending fails, the reason is
                shown on the submission detail under <em>Email error</em>.
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Recipients</Label>
              <div className="flex flex-wrap gap-2">
                {recipients.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs"
                  >
                    {r}
                    <button
                      type="button"
                      onClick={() =>
                        setRecipients(recipients.filter((x) => x !== r))
                      }
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${r}`}
                      disabled={!lock.isEditor}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Input
                  type="email"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  placeholder="recipient@example.com"
                  disabled={!lock.isEditor}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRecipient();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addRecipient}
                  disabled={!lock.isEditor}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={255}
                disabled={!lock.isEditor}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">
                Reply-to (use submitter&apos;s email field)
              </Label>
              <Select value={replyToField} onValueChange={setReplyToField}>
                <SelectTrigger disabled={!lock.isEditor}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {emailFields.map((f) => (
                    <SelectItem key={f.fieldKey} value={f.fieldKey}>
                      {f.label} ({f.fieldKey})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Email template</Label>
              <Textarea
                rows={8}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                maxLength={20000}
                className="font-mono text-xs"
                disabled={!lock.isEditor}
              />
              <p className="text-[10px] text-muted-foreground">
                Use <code>{`{{field_key}}`}</code> tokens (interpolated as plain
                text only — no HTML). Available keys:{" "}
                {fields.map((f) => f.fieldKey).join(", ") || "—"}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="space-y-1 rounded-md border p-4">
        <LabelWithHelp label="Redirect after submit">
          Optional. Same-origin path only (e.g. <code>/thanks</code>). If empty,
          the success message is shown in place.
        </LabelWithHelp>
        <Input
          value={redirectUrl}
          onChange={(e) => setRedirectUrl(e.target.value)}
          placeholder="/thanks"
          disabled={!lock.isEditor}
        />
      </div>

      <div>
        <Button onClick={save} disabled={busy || !lock.isEditor}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" /> Save settings
        </Button>
      </div>
    </div>
  );
}
