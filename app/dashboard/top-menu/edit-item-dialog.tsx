"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateMenuItem } from "./actions";

type Props = {
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

export function EditItemDialog({ item, onSuccess, disabled, clientId }: Props) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isLinked = !!item.contentId || !!item.categoryId;
  const isContentLinked = isLinked;

  const formSchema = z.object({
    label: z.string().min(1, "Label is required.").max(200),
    url: isContentLinked
      ? z.string().optional()
      : z
          .string()
          .min(1, "URL is required.")
          .max(2000)
          .refine(
            (v) => /^https?:\/\//i.test(v) || v.startsWith("/"),
            "Must start with http(s):// or /",
          ),
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
          <span className="sr-only">Edit</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit menu item</DialogTitle>
          <DialogDescription>
            {isContentLinked
              ? "URL is locked because this item is linked to content or a category. It will follow the source automatically."
              : "Edit the label, URL, and link target."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
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
                  <FormLabel>URL</FormLabel>
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
                  <FormLabel>Open in</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_self">Same tab</SelectItem>
                      <SelectItem value="_blank">New tab</SelectItem>
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
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
