"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/components/i18n-provider";
import { updateFile } from "./actions";
import type { FileRow } from "@/data/files";

type Props = {
  file: FileRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (file: FileRow) => void;
};

export function EditFileDialog({ file, open, onOpenChange, onUpdated }: Props) {
  const t = useTranslations();
  const [filename, setFilename] = useState(file.filename);
  const [title, setTitle] = useState(file.title ?? "");
  const [alt, setAlt] = useState(file.alt ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      setFilename(file.filename);
      setTitle(file.title ?? "");
      setAlt(file.alt ?? "");
      setError(null);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [open, file]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await updateFile({
      id: file.id,
      filename,
      title,
      alt,
    });
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if ("file" in result && result.file) {
      onUpdated(result.file);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("dashboard.files.edit.title")}</DialogTitle>
            <DialogDescription>
              {t("dashboard.files.edit.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filename">
                {t("dashboard.files.edit.filename")}
              </Label>
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                {t("dashboard.files.edit.displayTitle")}
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alt">{t("dashboard.files.edit.altText")}</Label>
              <Textarea
                id="alt"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                rows={3}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t("dashboard.common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("dashboard.common.actions.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
