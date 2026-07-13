"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";

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
import { createCategory } from "@/app/dashboard/content-categories/actions";
import { useTranslations } from "@/components/i18n-provider";
import type { TranslateFn } from "@/lib/i18n/translate";

function getFormSchema(t: TranslateFn) {
  return z.object({
    name: z
      .string()
      .min(1, t("dashboard.contentCategories.validation.nameRequired"))
      .max(100, t("dashboard.contentCategories.validation.nameMax")),
  });
}

type FormValues = {
  name: string;
};

type Props = {
  contentType: "page" | "blog_post";
  onSuccess?: () => void;
};

export function CreateCategoryDialog({ contentType, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const t = useTranslations();
  const formSchema = useMemo(() => getFormSchema(t), [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await createCategory({ name: values.name, contentType });

    if (result.error) {
      setServerError(result.error);
      return;
    }

    form.reset();
    setOpen(false);
    onSuccess?.();
  }

  const label =
    contentType === "page"
      ? t("dashboard.contentCategories.types.page")
      : t("dashboard.contentCategories.types.blogPost");
  const lowercaseLabel =
    contentType === "page"
      ? t("dashboard.contentCategories.types.pageLower")
      : t("dashboard.contentCategories.types.blogPostLower");

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
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t("dashboard.contentCategories.actions.addCategory")}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("dashboard.contentCategories.dialogs.createTitle", {
              type: label,
            })}
          </DialogTitle>
          <DialogDescription>
            {t("dashboard.contentCategories.dialogs.createDescription", {
              type: lowercaseLabel,
            })}
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
                    {t("dashboard.contentCategories.form.categoryName")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(
                        "dashboard.contentCategories.form.categoryNamePlaceholder",
                      )}
                      {...field}
                    />
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
                {t("dashboard.contentCategories.actions.cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("dashboard.contentCategories.actions.create")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
