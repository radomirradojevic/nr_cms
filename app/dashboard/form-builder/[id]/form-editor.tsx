"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, EyeOff, Save, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
import { useFormEditLock } from "@/components/form-edit-lock-provider";
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
  const t = useTranslations();
  const router = useRouter();
  const lock = useFormEditLock();
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
        lockClientId: lock.clientId,
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(t("dashboard.forms.editor.saved"));
      router.refresh();
    });
  }

  function handlePublish() {
    startBusy(async () => {
      const res = await publishForm({
        id: form.id,
        lockClientId: lock.clientId,
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(t("dashboard.forms.editor.published"));
      router.refresh();
    });
  }

  function handleUnpublish() {
    startBusy(async () => {
      const res = await unpublishForm({
        id: form.id,
        lockClientId: lock.clientId,
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(t("dashboard.forms.editor.unpublished"));
      router.refresh();
    });
  }

  function copyEmbed(html: string) {
    void navigator.clipboard.writeText(html).then(
      () => toast.success(t("dashboard.forms.editor.copied")),
      () => toast.error(t("dashboard.forms.editor.copyFailed")),
    );
  }

  const embedDiv = `<div data-cms-form-id="${form.id}"></div>`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        {(["meta", "fields", "settings", "embed"] as Tab[]).map((tabId) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setTab(tabId)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === tabId
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            {tabId === "meta"
              ? t("dashboard.forms.general")
              : tabId === "fields"
                ? t("dashboard.forms.fields")
                : tabId === "settings"
                  ? t("dashboard.forms.settings")
                  : t("dashboard.forms.embed")}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {form.status === "published" ? (
            <Button
              variant="outline"
              onClick={handleUnpublish}
              disabled={busy || !lock.isEditor}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <EyeOff className="mr-2 h-4 w-4" />{" "}
              {t("dashboard.forms.editor.unpublish")}
            </Button>
          ) : (
            <Button onClick={handlePublish} disabled={busy || !lock.isEditor}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" />{" "}
              {t("dashboard.forms.editor.publish")}
            </Button>
          )}
        </div>
      </div>

      {tab === "meta" && (
        <div className="space-y-4 max-w-2xl">
          <div className="space-y-1">
            <Label>{t("dashboard.forms.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              disabled={!lock.isEditor}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("dashboard.common.table.description")}</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              disabled={!lock.isEditor}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("dashboard.forms.editor.submitButtonLabel")}</Label>
              <Input
                value={submitLabel}
                onChange={(e) => setSubmitLabel(e.target.value)}
                maxLength={60}
                disabled={!lock.isEditor}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("dashboard.forms.editor.successMessage")}</Label>
              <Input
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
                maxLength={2000}
                disabled={!lock.isEditor}
              />
            </div>
          </div>
          <div>
            <Button onClick={saveMeta} disabled={savingMeta || !lock.isEditor}>
              {savingMeta && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />{" "}
              {t("dashboard.common.actions.save")}
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
            {t("dashboard.forms.editor.embedHelp")}
          </p>
          <div className="space-y-2">
            <Label>{t("dashboard.forms.editor.embedPlaceholder")}</Label>
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
