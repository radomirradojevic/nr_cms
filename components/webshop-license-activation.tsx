"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";

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
}: {
  action: ActivationAction;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_WEBSHOP_ACTIVATION_STATE,
  );

  return (
    <form action={formAction} className="rounded-lg border bg-background p-5">
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/40">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Webshop activation</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Activation is available for Vercel and self-hosted deployments.
              Package tokens are used for install only and are not stored by the
              CMS.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="webshop-license-key">License key</Label>
            <Input
              id="webshop-license-key"
              name="licenseKey"
              placeholder="ws_..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webshop-package-token">Package token</Label>
            <Input
              id="webshop-package-token"
              name="packageToken"
              placeholder="Temporary install token"
              required
              type="password"
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
          {pending ? "Activating..." : "Activate Webshop"}
        </Button>
      </div>
    </form>
  );
}
