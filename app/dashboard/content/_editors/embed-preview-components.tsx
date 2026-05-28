"use client";

import { useEffect, useMemo, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { ClipboardList, ImageIcon } from "lucide-react";

import {
  fetchFormEditorPreview,
  fetchFormSubmissionsEditorPreview,
} from "@/app/dashboard/form-builder/actions";
import { fetchGalleryPreview } from "@/app/dashboard/gallerymanager/actions";
import { Button } from "@/components/ui/button";
import { CmsFormField, type FieldValue } from "@/components/cms-form-field";
import { FormSubmissionCell } from "@/components/form-submission-cell";
import { useRegionalSettings } from "@/components/regional-settings-provider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  collectSubmissionKeys,
  normalizeSubmissionData,
  resolveFieldLabel,
} from "@/lib/form-submissions";
import { cn } from "@/lib/utils";
import type { FormFieldRow } from "@/lib/form-types";

type GalleryPreviewImage = {
  fileId: string;
  alt: string;
  title: string;
};

type FormPreviewDetail =
  Awaited<ReturnType<typeof fetchFormEditorPreview>> extends infer Result
    ? Result extends { success: true; form: infer Form; fields: infer Fields }
      ? { form: Form; fields: Fields }
      : never
    : never;

type SubmissionPreview = {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
};

type FormSubmissionsPreviewDetail = {
  formName: string;
  fields: FormFieldRow[];
  submissions: SubmissionPreview[];
  total: number;
  usingMock: boolean;
};

function attrString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function attrNumber(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function attrBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function GalleryPreviewNodeView({ node }: NodeViewProps) {
  const galleryId = attrString(node.attrs.galleryId);
  const fallbackName = attrString(node.attrs.galleryName);
  const [state, setState] = useState<
    | { status: "loading" }
    | {
        status: "ready";
        sourceId: string;
        name: string;
        images: GalleryPreviewImage[];
      }
    | { status: "empty"; sourceId: string; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    if (!galleryId) return;

    void fetchGalleryPreview({ id: galleryId }).then((res) => {
      if (cancelled) return;
      if ("error" in res) {
        setState({
          status: "empty",
          sourceId: galleryId,
          message: `Gallery not found${fallbackName ? ` (${fallbackName})` : ""}.`,
        });
        return;
      }
      setState({
        status: "ready",
        sourceId: galleryId,
        name: res.name,
        images: res.images,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [fallbackName, galleryId]);

  return (
    <NodeViewWrapper className="tiptap-gallery">
      {!galleryId ? (
        <EditorEmptyPreview>Gallery preview unavailable.</EditorEmptyPreview>
      ) : state.status === "loading" || state.sourceId !== galleryId ? (
        <div className="not-prose my-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square rounded-md" />
          ))}
        </div>
      ) : state.status === "empty" ? (
        <EditorEmptyPreview>{state.message}</EditorEmptyPreview>
      ) : state.images.length === 0 ? (
        <EditorEmptyPreview>
          {state.name
            ? `Gallery "${state.name}" is empty.`
            : "Gallery is empty."}
        </EditorEmptyPreview>
      ) : (
        <div
          className="not-prose my-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
          data-gallery-grid
        >
          {state.images.slice(0, 12).map((img) => (
            <div
              key={img.fileId}
              className="group relative block aspect-square w-full overflow-hidden rounded-md border bg-muted p-0 leading-none"
              aria-label={img.alt || img.title}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/${img.fileId}`}
                alt={img.alt}
                loading="lazy"
                className={cn(
                  "absolute inset-0 m-0 block !h-full !w-full !max-w-none !object-cover transition-transform duration-300",
                  "group-hover:scale-105",
                )}
                draggable={false}
              />
            </div>
          ))}
        </div>
      )}
    </NodeViewWrapper>
  );
}

export function CmsFormPreviewNodeView({ node }: NodeViewProps) {
  return (
    <NodeViewWrapper className="tiptap-cms-form">
      <CmsFormEditorPreview
        formId={attrString(node.attrs.formId)}
        formName={attrString(node.attrs.formName)}
      />
    </NodeViewWrapper>
  );
}

export function CmsFormEditorPreview({
  formId,
  formName: fallbackName = "",
}: {
  formId: string;
  formName?: string;
}) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; sourceId: string; detail: FormPreviewDetail }
    | { status: "empty"; sourceId: string; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    if (!formId) return;

    void fetchFormEditorPreview({ id: formId }).then((res) => {
      if (cancelled) return;
      if ("error" in res) {
        setState({
          status: "empty",
          sourceId: formId,
          message: `Form not found${fallbackName ? ` (${fallbackName})` : ""}.`,
        });
        return;
      }
      setState({ status: "ready", sourceId: formId, detail: res });
    });

    return () => {
      cancelled = true;
    };
  }, [fallbackName, formId]);

  return (
    <>
      {!formId ? (
        <EditorEmptyPreview>Form preview unavailable.</EditorEmptyPreview>
      ) : state.status === "loading" || state.sourceId !== formId ? (
        <div className="my-4 space-y-3 rounded-lg border p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-24" />
        </div>
      ) : state.status === "empty" ? (
        <EditorEmptyPreview>{state.message}</EditorEmptyPreview>
      ) : state.detail.fields.length === 0 ? (
        <EditorEmptyPreview>
          Form &quot;{state.detail.form.name}&quot; has no fields.
        </EditorEmptyPreview>
      ) : (
        <div
          className="my-4 space-y-4 rounded-lg border p-4"
          aria-label={`${state.detail.form.name} form preview`}
        >
          {state.detail.fields.slice(0, 8).map((field) => (
            <CmsFormField
              key={field.id}
              field={field}
              value={initialPreviewValue(field)}
              onChange={() => undefined}
              disabled
            />
          ))}
          <Button type="button" disabled>
            {state.detail.form.submitLabel}
          </Button>
        </div>
      )}
    </>
  );
}

export function FormSubmissionsPreviewNodeView({ node }: NodeViewProps) {
  return (
    <NodeViewWrapper className="tiptap-cms-form-submissions">
      <FormSubmissionsEditorPreview
        formId={attrString(node.attrs.formId)}
        formName={attrString(node.attrs.formName)}
        displayMode={node.attrs.displayMode === "card" ? "card" : "table"}
        pageSize={attrNumber(node.attrs.pageSize, 5)}
        hideId={attrBoolean(node.attrs.hideId, true)}
        hideSubmitted={attrBoolean(node.attrs.hideSubmitted, false)}
      />
    </NodeViewWrapper>
  );
}

export function FormSubmissionsEditorPreview({
  formId,
  formName: fallbackName = "",
  displayMode = "table",
  pageSize: requestedPageSize = 5,
  hideId = true,
  hideSubmitted = false,
}: {
  formId: string;
  formName?: string;
  displayMode?: "table" | "card";
  pageSize?: number;
  hideId?: boolean;
  hideSubmitted?: boolean;
}) {
  const pageSize = Math.min(5, Math.max(1, requestedPageSize));
  const [state, setState] = useState<
    | { status: "loading" }
    | {
        status: "ready";
        sourceId: string;
        pageSize: number;
        detail: FormSubmissionsPreviewDetail;
      }
    | { status: "empty"; sourceId: string; message: string }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    if (!formId) return;

    void fetchFormSubmissionsEditorPreview({
      formId,
      limit: pageSize,
    }).then((res) => {
      if (cancelled) return;
      if ("error" in res) {
        setState({
          status: "empty",
          sourceId: formId,
          message: `Submissions not found${fallbackName ? ` (${fallbackName})` : ""}.`,
        });
        return;
      }
      setState({ status: "ready", sourceId: formId, pageSize, detail: res });
    });

    return () => {
      cancelled = true;
    };
  }, [fallbackName, formId, pageSize]);

  return (
    <>
      {!formId ? (
        <EditorEmptyPreview>
          Form submissions preview unavailable.
        </EditorEmptyPreview>
      ) : state.status === "loading" ||
        state.sourceId !== formId ||
        ("pageSize" in state && state.pageSize !== pageSize) ? (
        <div className="my-4 space-y-2 rounded-lg border p-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : state.status === "empty" ? (
        <EditorEmptyPreview>{state.message}</EditorEmptyPreview>
      ) : (
        <div className="my-4 space-y-3" aria-label="Form submissions preview">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5" />
            <span>
              {state.detail.formName} submissions preview
              {state.detail.usingMock ? " (sample data)" : ""}
            </span>
          </div>
          {displayMode === "card" ? (
            <SubmissionsCardPreview
              detail={state.detail}
              hideId={hideId}
              hideSubmitted={hideSubmitted}
            />
          ) : (
            <SubmissionsTablePreview
              detail={state.detail}
              hideId={hideId}
              hideSubmitted={hideSubmitted}
            />
          )}
        </div>
      )}
    </>
  );
}

function SubmissionsTablePreview({
  detail,
  hideId,
  hideSubmitted,
}: {
  detail: FormSubmissionsPreviewDetail;
  hideId: boolean;
  hideSubmitted: boolean;
}) {
  const { formatDateTime } = useRegionalSettings();
  const columns = usePreviewColumns(detail);

  if (columns.length === 0 || detail.submissions.length === 0) {
    return (
      <EditorEmptyPreview>No submission columns to preview.</EditorEmptyPreview>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              {!hideId && (
                <th className="w-24 px-4 py-3 text-left font-medium text-foreground">
                  ID
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col}
                  className="whitespace-nowrap px-4 py-3 text-left font-medium text-foreground"
                >
                  {resolveFieldLabel(col, detail.fields)}
                </th>
              ))}
              {!hideSubmitted && (
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-foreground">
                  Submitted
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {detail.submissions.map((sub) => {
              const normalized = normalizeSubmissionData(sub.data);
              return (
                <tr key={sub.id}>
                  {!hideId && (
                    <td className="truncate px-4 py-3 font-mono text-xs text-muted-foreground">
                      {sub.id.slice(0, 8)}
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={`${sub.id}-${col}`} className="px-4 py-3">
                      <FormSubmissionCell
                        value={normalized[col] || { type: "null", value: null }}
                      />
                    </td>
                  ))}
                  {!hideSubmitted && (
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatDateTime(sub.createdAt)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubmissionsCardPreview({
  detail,
  hideId,
  hideSubmitted,
}: {
  detail: FormSubmissionsPreviewDetail;
  hideId: boolean;
  hideSubmitted: boolean;
}) {
  const { formatDateTime } = useRegionalSettings();
  const columns = usePreviewColumns(detail);

  if (columns.length === 0 || detail.submissions.length === 0) {
    return <EditorEmptyPreview>No submissions to preview.</EditorEmptyPreview>;
  }

  return (
    <div className="space-y-3">
      {detail.submissions.map((sub) => {
        const normalized = normalizeSubmissionData(sub.data);
        return (
          <div
            key={sub.id}
            className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            {columns.map((col) => (
              <div
                key={`${sub.id}-${col}`}
                className="border-b border-border pb-2 last:border-b-0"
              >
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  {resolveFieldLabel(col, detail.fields)}
                </div>
                <FormSubmissionCell
                  value={normalized[col] || { type: "null", value: null }}
                />
              </div>
            ))}
            {(!hideId || !hideSubmitted) && (
              <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                {!hideId && (
                  <span className="font-mono">{sub.id.slice(0, 8)}</span>
                )}
                {!hideSubmitted && <span>{formatDateTime(sub.createdAt)}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function usePreviewColumns(detail: FormSubmissionsPreviewDetail) {
  return useMemo(
    () =>
      collectSubmissionKeys(
        detail.submissions.map((submission) => ({ data: submission.data })),
      ),
    [detail.submissions],
  );
}

function initialPreviewValue(field: FormFieldRow): FieldValue {
  if (field.fieldType === "checkbox") {
    const opts = (field.options ?? {}) as {
      choices?: { value: string; label: string }[];
    };
    return Array.isArray(opts.choices) && opts.choices.length > 0 ? [] : false;
  }
  return "";
}

function EditorEmptyPreview({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
      <div className="mb-2 flex justify-center">
        <ImageIcon className="h-4 w-4" />
      </div>
      {children}
    </div>
  );
}
