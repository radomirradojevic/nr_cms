"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isValidMenuUrl } from "@/lib/menu-url";
import { updateMenuItem } from "./actions";

type Props = {
  menuId: string;
  item: {
    id: string;
    label: string;
    url: string;
    target: "_self" | "_blank";
    contentId: string | null;
    categoryId: string | null;
  };
  onSuccess?: () => void;
  disabled?: boolean;
  clientId?: string;
};

export function EditItemDialog({
  menuId,
  item,
  onSuccess,
  disabled,
  clientId,
}: Props) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isLinked = !!item.contentId || !!item.categoryId;
  const isContentLinked = isLinked;

  const formSchema = z.object({
    label: z
      .string()
      .min(1, t("dashboard.menus.customLink.labelRequired"))
      .max(200),
    url: isContentLinked
      ? z.string().optional()
      : z
          .string()
          .min(1, t("dashboard.menus.customLink.urlRequired"))
          .max(2000)
          .refine(isValidMenuUrl, t("dashboard.menus.customLink.invalidUrl")),
    target: z.enum(["_self", "_blank"]),
  });
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: item.label,
      url: item.url,
      target: item.target,
    },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await updateMenuItem(
      {
        menuId,
        id: item.id,
        label: values.label,
        target: values.target,
        ...(isContentLinked ? {} : { url: values.url }),
      },
      clientId,
    );
    if ("error" in result && result.error) {
      setServerError(result.error);
      return;
    }
    setOpen(false);
    onSuccess?.();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset({
            label: item.label,
            url: item.url,
            target: item.target,
          });
          setServerError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={disabled}>
          <Pencil className="h-4 w-4" />
          <span className="sr-only">
            {t("dashboard.menus.customLink.editSr")}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dashboard.menus.customLink.edit")}</DialogTitle>
          <DialogDescription>
            {isContentLinked
              ? t("dashboard.menus.customLink.linkedDescription")
              : t("dashboard.menus.customLink.editDescription")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("dashboard.menus.customLink.label")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("dashboard.menus.customLink.url")}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isContentLinked} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="target"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("dashboard.menus.customLink.openIn")}
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_self">
                        {t("dashboard.menus.target.sameTab")}
                      </SelectItem>
                      <SelectItem value="_blank">
                        {t("dashboard.menus.target.newTab")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
                {t("dashboard.common.actions.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
