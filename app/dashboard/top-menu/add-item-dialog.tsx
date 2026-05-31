"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMenuItem } from "./actions";

const formSchema = z.object({
  label: z.string().min(1, "Label is required.").max(200),
  url: z
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

type Props = {
  menuId: string;
  parentId: string | null;
  onSuccess?: () => void;
  disabled?: boolean;
  clientId?: string;
};

export function AddItemDialog({
  menuId,
  parentId,
  onSuccess,
  disabled,
  clientId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { label: "", url: "https://", target: "_self" },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await createMenuItem(
      {
        kind: "custom",
        menuId,
        label: values.label,
        url: values.url,
        target: values.target,
        parentId,
      },
      clientId,
    );
    if ("error" in result && result.error) {
      setServerError(result.error);
      return;
    }
    form.reset({ label: "", url: "https://", target: "_self" });
    setOpen(false);
    onSuccess?.();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset({ label: "", url: "https://", target: "_self" });
          setServerError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          <Plus className="mr-2 h-4 w-4" />
          Add custom link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add custom link</DialogTitle>
          <DialogDescription>
            Add a menu item with a custom URL (external or internal path).
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
                    <Input placeholder="e.g. Documentation" {...field} />
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
                    <Input
                      placeholder="https://example.com or /path"
                      {...field}
                    />
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
                Create
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
