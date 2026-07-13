"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useTranslations } from "@/components/i18n-provider";
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
import { updateGallery } from "./actions";
import type { GalleryListItem } from "@/data/galleries";

type Props = {
  gallery: GalleryListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (patch: {
    id: string;
    name: string;
    description: string | null;
  }) => void;
};

export function EditGalleryDialog({
  gallery,
  open,
  onOpenChange,
  onUpdated,
}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [name, setName] = useState(gallery.name);
  const [description, setDescription] = useState(gallery.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      setName(gallery.name);
      setDescription(gallery.description ?? "");
      setError(null);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [open, gallery]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await updateGallery({
      id: gallery.id,
      name,
      description,
    });
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    toast.success(t("dashboard.galleries.galleryUpdated"));
    if ("gallery" in result && result.gallery) {
      onUpdated?.({
        id: result.gallery.id,
        name: result.gallery.name,
        description: result.gallery.description ?? null,
      });
    }
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {t("dashboard.galleries.editDialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t("dashboard.galleries.editDialog.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="gallery-name">
                {t("dashboard.galleries.createDialog.name")}
              </Label>
              <Input
                id="gallery-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gallery-description">
                {t("dashboard.galleries.createDialog.descriptionLabel")}
              </Label>
              <Textarea
                id="gallery-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={1000}
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
