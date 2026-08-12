"use client";

import { useActionState, useState, type FormEvent } from "react";
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
  buyLabel,
  buyUrl,
  purchaseIntentHandoff,
  description,
  inputId = "webshop-license-key",
  submitLabel,
  title,
}: {
  action: ActivationAction;
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

  function submitPurchaseIntentHandoff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (purchaseHandoffPending) return;
    setPurchaseHandoffPending(true);
    // React handles function-valued form actions. This cross-origin handoff is
    // deliberately a native HTML POST so the browser owns the vendor's 303
    // navigation and Set-Cookie response.
    HTMLFormElement.prototype.submit.call(event.currentTarget);
  }

  return (
    <div className="rounded-lg border bg-background p-5">
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
          <form
            action={purchaseIntentHandoff.action}
            aria-busy={purchaseHandoffPending}
            className="flex flex-wrap gap-2"
            encType="application/x-www-form-urlencoded"
            method="post"
            onSubmit={submitPurchaseIntentHandoff}
          >
            <input
              name="purchaseIntent"
              type="hidden"
              value={purchaseIntentHandoff.purchaseIntent}
            />
            <Button
              disabled={purchaseHandoffPending}
              type="submit"
              variant="outline"
            >
              <ExternalLink className="h-4 w-4" />
              {resolvedBuyLabel}
            </Button>
          </form>
        ) : buyUrl ? (
          <Button asChild variant="outline">
            <a href={buyUrl} rel="noopener noreferrer" target="_blank">
              <ExternalLink className="h-4 w-4" />
              {resolvedBuyLabel}
            </a>
          </Button>
        ) : null}

        <form action={formAction} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={inputId}>{t("addons.common.licenseKey")}</Label>
              <Input
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
