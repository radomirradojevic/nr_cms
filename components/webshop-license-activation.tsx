"use client";

import { useActionState, useState } from "react";
import { ExternalLink, KeyRound } from "lucide-react";

import { useTranslations } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type WebshopActivationFormState = {
  message?: string;
  status: "idle" | "success" | "error";
};

type ActivationAction = (
  prevState: WebshopActivationFormState,
  formData: FormData,
) => Promise<WebshopActivationFormState>;

const INITIAL_WEBSHOP_ACTIVATION_STATE: WebshopActivationFormState = {
  status: "idle",
};

export function WebshopLicenseActivation({
  action,
  addonKey = "webshop",
  buyLabel,
  buyUrl,
  purchaseIntentHandoff,
  description,
  inputId = "webshop-license-key",
  submitLabel,
  title,
}: {
  action: ActivationAction;
  addonKey?: "license-server" | "webshop";
  buyLabel?: string;
  /** Legacy non-Webshop activation may still use a normal informational link. */
  buyUrl?: string | null;
  purchaseIntentHandoff?: { action: string; purchaseIntent: string } | null;
  description?: string;
  inputId?: string;
  submitLabel?: string;
  title?: string;
}) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_WEBSHOP_ACTIVATION_STATE,
  );
  const [purchaseHandoffPending, setPurchaseHandoffPending] = useState(false);
  const resolvedBuyLabel = buyLabel ?? t("addons.webshop.buyLicenseKey");
  const resolvedDescription =
    description ?? t("addons.webshop.activationDescription");
  const resolvedSubmitLabel = submitLabel ?? t("addons.webshop.activate");
  const resolvedTitle = title ?? t("addons.webshop.activationTitle");

  function submitPurchaseIntentHandoff() {
    if (purchaseHandoffPending || !purchaseIntentHandoff) return;
    setPurchaseHandoffPending(true);

    // Submit a detached native form from a click event. Calling form.submit()
    // from inside that same form's submit event can send the cross-origin POST
    // while leaving Chrome on the original document instead of following the
    // vendor's Set-Cookie + 303 navigation.
    const form = document.createElement("form");
    form.action = purchaseIntentHandoff.action;
    form.enctype = "application/x-www-form-urlencoded";
    form.method = "post";
    form.hidden = true;

    const intent = document.createElement("input");
    intent.name = "purchaseIntent";
    intent.type = "hidden";
    intent.value = purchaseIntentHandoff.purchaseIntent;
    form.append(intent);
    document.body.append(form);
    HTMLFormElement.prototype.submit.call(form);
  }

  return (
    <div
      className="rounded-lg border bg-background p-5"
      data-nr-addon-key={addonKey}
      data-nr-addon-state="activation_required"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/40">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{resolvedTitle}</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {resolvedDescription}
            </p>
          </div>
        </div>

        {purchaseIntentHandoff ? (
          <div
            aria-busy={purchaseHandoffPending}
            className="flex flex-wrap gap-2"
          >
            <Button
              data-nr-addon-action="purchase"
              disabled={purchaseHandoffPending}
              onClick={submitPurchaseIntentHandoff}
              type="button"
              variant="outline"
            >
              <ExternalLink className="h-4 w-4" />
              {resolvedBuyLabel}
            </Button>
          </div>
        ) : buyUrl ? (
          <Button asChild variant="outline">
            <a href={buyUrl} rel="noopener noreferrer" target="_blank">
              <ExternalLink className="h-4 w-4" />
              {resolvedBuyLabel}
            </a>
          </Button>
        ) : null}

        <form
          action={formAction}
          className="space-y-5"
          data-nr-addon-action="activate"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={inputId}>{t("addons.common.licenseKey")}</Label>
              <Input
                data-nr-addon-field="license-key"
                id={inputId}
                name="licenseKey"
                placeholder="NRLS-..."
                required
              />
            </div>
          </div>

          {state.status !== "idle" && state.message ? (
            <p
              className={
                state.status === "success"
                  ? "text-sm text-emerald-600"
                  : "text-sm text-destructive"
              }
            >
              {state.message}
            </p>
          ) : null}

          <Button disabled={pending} type="submit">
            {pending ? t("addons.common.activating") : resolvedSubmitLabel}
          </Button>
        </form>
      </div>
    </div>
  );
}
