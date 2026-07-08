"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil } from "lucide-react";

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
import { BackendUserCombobox } from "@/app/dashboard/_components/backend-user-combobox";
import {
  updateCategory,
  reassignCategoryOwner,
} from "@/app/dashboard/content-categories/actions";
import { useTranslations } from "@/components/i18n-provider";
import type { TranslateFn } from "@/lib/i18n/translate";

function getFormSchema(t: TranslateFn) {
  return z.object({
    name: z
      .string()
      .min(1, t("dashboard.contentCategories.validation.nameRequired"))
      .max(100, t("dashboard.contentCategories.validation.nameMax")),
    ownerId: z
      .string()
      .min(1, t("dashboard.contentCategories.validation.authorRequired")),
  });
}

type FormValues = {
  name: string;
  ownerId: string;
};

type Props = {
  category: {
    id: string;
    name: string;
    contentType: string;
    createdBy: string | null;
    createdByName: string | null;
  };
  onSuccess?: () => void;
};

export function EditCategoryDialog({ category, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const t = useTranslations();
  const formSchema = useMemo(() => getFormSchema(t), [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: category.name,
      ownerId: category.createdBy ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);

    const nameChanged = values.name !== category.name;
    const ownerChanged = values.ownerId !== (category.createdBy ?? "");

    const ops: Promise<{ error?: string; success?: boolean }>[] = [];
    if (nameChanged)
      ops.push(updateCategory({ id: category.id, name: values.name }));
    if (ownerChanged)
      ops.push(
        reassignCategoryOwner({ id: category.id, ownerId: values.ownerId }),
      );

    if (ops.length === 0) {
      setOpen(false);
      return;
    }

    const results = await Promise.all(ops);
    const firstError = results.find((r) => r.error);
    if (firstError?.error) {
      setServerError(firstError.error);
      return;
    }

    setOpen(false);
    onSuccess?.();
  }

  const typeLabel =
    category.contentType === "page"
      ? t("dashboard.contentCategories.types.page")
      : t("dashboard.contentCategories.types.blogPost");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset({
            name: category.name,
            ownerId: category.createdBy ?? "",
          });
          setServerError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">
            {t("dashboard.contentCategories.actions.edit")}
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("dashboard.contentCategories.dialogs.editTitle", {
              type: typeLabel,
            })}
          </DialogTitle>
          <DialogDescription>
            {t("dashboard.contentCategories.dialogs.editDescription")}
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ownerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("dashboard.contentCategories.form.author")}
                  </FormLabel>
                  <FormControl>
                    <BackendUserCombobox
                      value={field.value}
                      selectedUser={
                        category.createdBy
                          ? {
                              id: category.createdBy,
                              name:
                                category.createdByName ?? category.createdBy,
                            }
                          : null
                      }
                      currentUserId={category.createdBy}
                      placeholder={t(
                        "dashboard.contentCategories.form.selectUserPlaceholder",
                      )}
                      onValueChange={(user) => field.onChange(user.id)}
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
                {t("dashboard.contentCategories.actions.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
