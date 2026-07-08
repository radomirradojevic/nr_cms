"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const t = useTranslations();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("public.contact.thanks")}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="contact-name">{t("public.contact.name")}</Label>
        <Input
          id="contact-name"
          placeholder={t("public.contact.namePlaceholder")}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="contact-email">{t("public.contact.email")}</Label>
        <Input
          id="contact-email"
          type="email"
          placeholder={t("public.contact.emailPlaceholder")}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="contact-message">{t("public.contact.message")}</Label>
        <textarea
          id="contact-message"
          placeholder={t("public.contact.messagePlaceholder")}
          required
          rows={4}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <Button type="submit" className="self-start cursor-pointer">
        {t("public.contact.send")}
      </Button>
    </form>
  );
}
