"use client";

import { useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { GalleryGrid, type GalleryGridImage } from "@/components/gallery-grid";
import { CmsFormRenderer } from "@/components/cms-form-renderer";
import { FormSubmissionsRenderer } from "@/app/dashboard/content/_builder/blocks/form-submissions/renderer";
import type { FormDetail, FormFieldRow } from "@/lib/form-types";

const embedRoots = new WeakMap<HTMLElement, { root: Root; version: number }>();

export type BlogGalleryEmbed = {
  id: string;
  name: string;
  images: GalleryGridImage[];
};

export type BlogFormEmbed = {
  id: string;
  detail: FormDetail | null;
};

export type BlogFormSubmissionsEmbed = {
  id: string;
  fields: FormFieldRow[] | null;
};

type Props = {
  scopeId: string;
  galleries: BlogGalleryEmbed[];
  forms: BlogFormEmbed[];
  formSubmissions: BlogFormSubmissionsEmbed[];
};

function MissingEmbed({ label }: { label: string }) {
  return (
    <div className="my-4 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
      {label} is unavailable.
    </div>
  );
}

function attrValue(element: Element, name: string): string | null {
  return element.getAttribute(name);
}

function parseDisplayMode(value: string | null): "table" | "card" {
  return value === "card" ? "card" : "table";
}

function parsePageSize(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(100, Math.max(1, parsed));
}

function parseBoolean(value: string | null): boolean {
  return value !== "false";
}

export function BlogContentEmbeds({
  scopeId,
  galleries,
  forms,
  formSubmissions,
}: Props) {
  useEffect(() => {
    const scope = document.querySelector<HTMLElement>(
      `[data-blog-content-root="${scopeId}"]`,
    );
    if (!scope) return;

    const roots: Array<{ element: HTMLElement; root: Root; version: number }> =
      [];
    const galleryById = new Map(
      galleries.map((gallery) => [gallery.id, gallery]),
    );
    const formById = new Map(forms.map((form) => [form.id, form.detail]));
    const formSubmissionsById = new Map(
      formSubmissions.map((form) => [form.id, form.fields]),
    );

    function renderInto(element: HTMLElement, children: React.ReactNode) {
      const existing = embedRoots.get(element);
      const record = existing
        ? { root: existing.root, version: existing.version + 1 }
        : { root: createRoot(element), version: 1 };

      embedRoots.set(element, record);
      roots.push({ element, ...record });
      record.root.render(children);
    }

    scope
      .querySelectorAll<HTMLElement>("div[data-gallery-id]")
      .forEach((el) => {
        const id = el.dataset.galleryId;
        if (!id) return;

        const gallery = galleryById.get(id) ?? null;
        renderInto(
          el,
          gallery ? (
            <GalleryGrid images={gallery.images} galleryName={gallery.name} />
          ) : (
            <MissingEmbed label="Gallery" />
          ),
        );
      });

    scope
      .querySelectorAll<HTMLElement>("div[data-cms-form-id]")
      .forEach((el) => {
        const id = el.dataset.cmsFormId;
        if (!id) return;

        const detail = formById.get(id) ?? null;
        renderInto(
          el,
          detail ? (
            <CmsFormRenderer form={detail} />
          ) : (
            <MissingEmbed label="Form" />
          ),
        );
      });

    scope
      .querySelectorAll<HTMLElement>("div[data-cms-form-submissions-id]")
      .forEach((el) => {
        const id = el.dataset.cmsFormSubmissionsId;
        if (!id) return;

        const fields = formSubmissionsById.get(id) ?? null;
        renderInto(
          el,
          fields ? (
            <div className="cms-embedded-form-submissions">
              <FormSubmissionsRenderer
                formId={id}
                displayMode={parseDisplayMode(
                  attrValue(el, "data-cms-form-submissions-display-mode"),
                )}
                pageSize={parsePageSize(
                  attrValue(el, "data-cms-form-submissions-page-size"),
                )}
                sortField="created_at"
                sortOrder="desc"
                hideId={parseBoolean(
                  attrValue(el, "data-cms-form-submissions-hide-id"),
                )}
                fields={fields}
              />
            </div>
          ) : (
            <MissingEmbed label="Form submissions" />
          ),
        );
      });

    return () => {
      for (const { element, root, version } of roots) {
        queueMicrotask(() => {
          const current = embedRoots.get(element);
          if (
            !current ||
            current.root !== root ||
            current.version !== version
          ) {
            return;
          }

          root.unmount();
          embedRoots.delete(element);
        });
      }
    };
  }, [formSubmissions, forms, galleries, scopeId]);

  return null;
}
