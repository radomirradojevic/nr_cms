"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { useTranslations } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createGallery } from "./actions";

type FormValues = {
  name: string;
  description?: string;
};

export function CreateGalleryDialog() {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(
      z.object({
        name: z
          .string()
          .min(1, t("dashboard.galleries.nameRequired"))
          .max(120, t("dashboard.galleries.errors.nameMax")),
        description: z
          .string()
          .max(1000, t("dashboard.galleries.errors.descriptionMax"))
          .optional(),
      }),
    ),
    defaultValues: { name: "", description: "" },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await createGallery({
      name: values.name,
      description: values.description ?? null,
    });
    if ("error" in result && result.error) {
      setServerError(result.error);
      return;
    }
    toast.success(t("dashboard.galleries.galleryCreated"));
    form.reset();
    setOpen(false);
    if ("id" in result && result.id) {
      router.push(`/dashboard/gallerymanager/${result.id}`);
    } else {
      router.refresh();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset();
          setServerError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("dashboard.galleries.create")}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("dashboard.galleries.createDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("dashboard.galleries.createDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("dashboard.galleries.createDialog.name")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(
                        "dashboard.galleries.createDialog.namePlaceholder",
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("dashboard.galleries.createDialog.descriptionLabel")}
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t("dashboard.common.actions.cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("dashboard.common.actions.create")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
