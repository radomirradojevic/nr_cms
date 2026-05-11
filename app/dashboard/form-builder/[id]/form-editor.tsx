"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, EyeOff, Save, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FormFieldRow, FormRow, FormSettingsRow } from "@/lib/form-types";
import { publishForm, unpublishForm, updateForm } from "../actions";
import { FieldBuilder } from "./field-builder";
import { FormSettingsForm } from "./form-settings-form";

type Props = {
  form: FormRow;
  fields: FormFieldRow[];
  settings: FormSettingsRow;
};

type Tab = "meta" | "fields" | "settings" | "embed";

export function FormEditor({ form, fields, settings }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("fields");
  const [name, setName] = useState(form.name);
  const [description, setDescription] = useState(form.description ?? "");
  const [submitLabel, setSubmitLabel] = useState(form.submitLabel);
  const [successMessage, setSuccessMessage] = useState(form.successMessage);
  const [savingMeta, startSaveMeta] = useTransition();
  const [busy, startBusy] = useTransition();

  function saveMeta() {
    startSaveMeta(async () => {
      const res = await updateForm({
        id: form.id,
        name,
        description: description || null,
        submitLabel,
        successMessage,
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Saved.");
      router.refresh();
    });
  }

  function handlePublish() {
    startBusy(async () => {
      const res = await publishForm({ id: form.id });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Form published.");
      router.refresh();
    });
  }

  function handleUnpublish() {
    startBusy(async () => {
      const res = await unpublishForm({ id: form.id });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Form unpublished.");
      router.refresh();
    });
  }

  function copyEmbed(html: string) {
    void navigator.clipboard.writeText(html).then(
      () => toast.success("Copied to clipboard."),
      () => toast.error("Could not copy."),
    );
  }

  const embedDiv = `<div data-cms-form-id="${form.id}"></div>`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        {(["meta", "fields", "settings", "embed"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {t === "meta"
              ? "General"
              : t === "fields"
                ? "Fields"
                : t === "settings"
                  ? "Settings"
                  : "Embed"}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {form.status === "published" ? (
            <Button variant="outline" onClick={handleUnpublish} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <EyeOff className="mr-2 h-4 w-4" /> Unpublish
            </Button>
          ) : (
            <Button onClick={handlePublish} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" /> Publish
            </Button>
          )}
        </div>
      </div>

      {tab === "meta" && (
        <div className="space-y-4 max-w-2xl">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Submit button label</Label>
              <Input
                value={submitLabel}
                onChange={(e) => setSubmitLabel(e.target.value)}
                maxLength={60}
              />
            </div>
            <div className="space-y-1">
              <Label>Success message</Label>
              <Input
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
                maxLength={2000}
              />
            </div>
          </div>
          <div>
            <Button onClick={saveMeta} disabled={savingMeta}>
              {savingMeta && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" /> Save
            </Button>
          </div>
        </div>
      )}

      {tab === "fields" && (
        <FieldBuilder formId={form.id} initialFields={fields} />
      )}

      {tab === "settings" && (
        <FormSettingsForm
          formId={form.id}
          initialSettings={settings}
          fields={fields}
        />
      )}

      {tab === "embed" && (
        <div className="space-y-4 max-w-2xl">
          <p className="text-sm text-muted-foreground">
            Use the page builder &ldquo;Form&rdquo; block, the blog
            editor&rsquo;s form picker, or paste the snippet below into a Raw
            HTML block.
          </p>
          <div className="space-y-2">
            <Label>Embed placeholder (Raw HTML / blog post)</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={embedDiv}
                onClick={(e) => e.currentTarget.select()}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => copyEmbed(embedDiv)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
