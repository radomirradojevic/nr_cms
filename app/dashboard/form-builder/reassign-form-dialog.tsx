"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { reassignForm } from "./actions";

const schema = z.object({
  ownerId: z.string().min(1, "Owner is required."),
});

type FormValues = z.infer<typeof schema>;

type AdminUser = { id: string; name: string };

type Props = {
  formId: string;
  formName: string;
  currentOwnerId: string | null;
  admins: AdminUser[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReassigned: (
    formId: string,
    newOwnerId: string,
    newOwnerName: string,
  ) => void;
};

export function ReassignFormDialog({
  formId,
  formName,
  currentOwnerId,
  admins,
  open,
  onOpenChange,
  onReassigned,
}: Props) {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ownerId: currentOwnerId ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const result = await reassignForm({ id: formId, ownerId: values.ownerId });
    if ("error" in result && result.error) {
      setServerError(result.error);
      return;
    }
    const newOwner = admins.find((a) => a.id === values.ownerId);
    onReassigned(formId, values.ownerId, newOwner?.name ?? values.ownerId);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          form.reset({ ownerId: currentOwnerId ?? "" });
          setServerError(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign Form</DialogTitle>
          <DialogDescription>
            Change the owner of &quot;{formName}&quot;.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="ownerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Owner</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an admin…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      {admins.map((admin) => (
                        <SelectItem key={admin.id} value={admin.id}>
                          {admin.name}
                        </SelectItem>
                      ))}
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
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <UserCog className="mr-2 h-4 w-4" />
                Reassign
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
