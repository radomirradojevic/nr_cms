"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, FolderTree } from "lucide-react";

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
import type { BlogCategoryPickerItem } from "@/data/top-menu";
import { createMenuItem } from "./actions";

const formSchema = z.object({
  categoryId: z.string().uuid("Pick a category."),
  label: z.string().max(200).optional(),
  target: z.enum(["_self", "_blank"]),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  parentId: string | null;
  categories: BlogCategoryPickerItem[];
  onSuccess?: () => void;
  disabled?: boolean;
  clientId?: string;
};

export function AddCategoryDialog({
  parentId,
  categories,
  onSuccess,
  disabled,
  clientId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { categoryId: "", label: "", target: "_self" },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await createMenuItem(
      {
        kind: "category",
        categoryId: values.categoryId,
        label: values.label?.trim() ? values.label.trim() : undefined,
        target: values.target,
        parentId,
      },
      clientId,
    );
    if ("error" in result && result.error) {
      setServerError(result.error);
      return;
    }
    form.reset({ categoryId: "", label: "", target: "_self" });
    setOpen(false);
    onSuccess?.();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset({ categoryId: "", label: "", target: "_self" });
          setServerError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled}>
          <FolderTree className="mr-2 h-4 w-4" />
          Add blog category
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add blog category</DialogTitle>
          <DialogDescription>
            Pick a blog category. The menu item will link to a page that lists
            all published blog posts in that category.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blog category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No blog categories available.
                        </div>
                      ) : (
                        categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Defaults to the category name"
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
              <Button
                type="submit"
                disabled={
                  form.formState.isSubmitting || categories.length === 0
                }
              >
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
