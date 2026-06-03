"use client";

import { useRef, useState } from "react";
import { put } from "@vercel/blob/client";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ALL_ALLOWED_MIMES, formatBytes } from "@/lib/file-manager";
import type { FileRow } from "@/data/files";

type Props = {
  onUploaded: (files: FileRow[]) => void;
  maxFileSize: number;
  maxBatchSize: number;
  storageProvider: "local" | "vercel-blob";
};

type UploadState = {
  active: boolean;
  progress: number;
  totalCount: number;
  processing: boolean;
};

type UploadApiResponse = {
  results: Array<
    { ok: true; file: FileRow } | { ok: false; filename: string; error: string }
  >;
};

type PreparedClientUpload = {
  storagePath: string;
  mimeType: string;
  clientToken: string;
  ticket: string;
};

export function UploadDropzone({
  onUploaded,
  maxFileSize,
  maxBatchSize,
  storageProvider,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [state, setState] = useState<UploadState>({
    active: false,
    progress: 0,
    totalCount: 0,
    processing: false,
  });

  function pickFiles() {
    inputRef.current?.click();
  }

  async function readResponseError(res: Response): Promise<string> {
    try {
      const data = (await res.json()) as { error?: unknown };
      if (typeof data.error === "string") return data.error;
    } catch {
      // Fall through to status text.
    }
    return res.statusText || `HTTP ${res.status}`;
  }

  function getErrorMessage(err: unknown): string {
    return err instanceof Error ? err.message : "Upload failed.";
  }

  async function uploadViaApi(accepted: File[]): Promise<FileRow[]> {
    const form = new FormData();
    for (const f of accepted) form.append("file", f);

    const xhr = new XMLHttpRequest();
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      xhr.open("POST", "/api/files");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setState((s) => ({
            ...s,
            progress: pct,
            processing: pct >= 100,
          }));
        }
      };
      xhr.upload.onload = () => {
        setState((s) => ({ ...s, progress: 100, processing: true }));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as UploadApiResponse);
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error(xhr.responseText || `HTTP ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(form);
    });

    const successes: FileRow[] = [];
    for (const r of result.results) {
      if (r.ok) {
        successes.push(r.file);
      } else {
        toast.error(`${r.filename}: ${r.error}`);
      }
    }
    return successes;
  }

  async function prepareClientUpload(
    file: File,
  ): Promise<PreparedClientUpload> {
    const res = await fetch("/api/files/client-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        type: file.type,
        size: file.size,
      }),
    });
    if (!res.ok) throw new Error(await readResponseError(res));
    return (await res.json()) as PreparedClientUpload;
  }

  async function completeClientUpload(ticket: string): Promise<FileRow> {
    const res = await fetch("/api/files/client-upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket }),
    });
    if (!res.ok) throw new Error(await readResponseError(res));
    const data = (await res.json()) as { file: FileRow };
    return data.file;
  }

  async function uploadViaVercelBlob(
    accepted: File[],
    totalSize: number,
  ): Promise<FileRow[]> {
    const successes: FileRow[] = [];
    let completedBytes = 0;

    for (const file of accepted) {
      let fileAccounted = false;
      try {
        const prepared = await prepareClientUpload(file);
        await put(prepared.storagePath, file, {
          access: "public",
          token: prepared.clientToken,
          contentType: prepared.mimeType,
          multipart: file.size >= 8 * 1024 * 1024,
          onUploadProgress: ({ loaded }) => {
            const pct = Math.round(
              ((completedBytes + loaded) / totalSize) * 100,
            );
            setState((s) => ({
              ...s,
              progress: Math.min(99, pct),
              processing: false,
            }));
          },
        });
        completedBytes += file.size;
        fileAccounted = true;
        if (completedBytes >= totalSize) {
          setState((s) => ({ ...s, progress: 100, processing: true }));
        }
        successes.push(await completeClientUpload(prepared.ticket));
      } catch (err) {
        console.error(err);
        toast.error(`${file.name}: ${getErrorMessage(err)}`);
        if (!fileAccounted) completedBytes += file.size;
      }

      setState((s) => ({
        ...s,
        progress: Math.round((completedBytes / totalSize) * 100),
      }));
    }

    return successes;
  }

  async function handleFiles(fileList: FileList | File[]) {
    const all = Array.from(fileList);
    const accepted: File[] = [];
    let totalSize = 0;

    for (const f of all) {
      if (f.size > maxFileSize) {
        toast.error(`${f.name}: exceeds ${formatBytes(maxFileSize)} limit.`);
        continue;
      }
      if (
        f.type &&
        !ALL_ALLOWED_MIMES.includes(f.type) &&
        // some browsers omit a type for SVG/text - allow server to validate
        f.type !== ""
      ) {
        toast.error(`${f.name}: file type "${f.type}" is not allowed.`);
        continue;
      }
      accepted.push(f);
      totalSize += f.size;
    }

    if (accepted.length === 0) return;

    if (totalSize > maxBatchSize) {
      toast.error(
        `Total size ${formatBytes(totalSize)} exceeds batch limit of ${formatBytes(maxBatchSize)}.`,
      );
      return;
    }

    setState({
      active: true,
      progress: 0,
      totalCount: accepted.length,
      processing: false,
    });

    try {
      const successes =
        storageProvider === "vercel-blob"
          ? await uploadViaVercelBlob(accepted, totalSize)
          : await uploadViaApi(accepted);
      if (successes.length > 0) {
        toast.success(`Uploaded ${successes.length} file(s).`);
        onUploaded(successes);
      }
    } catch (err) {
      console.error(err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setState({
        active: false,
        progress: 0,
        totalCount: 0,
        processing: false,
      });
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Card
      onClick={pickFiles}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
      }}
      className={`border-dashed border-2 cursor-pointer p-8 text-center transition-colors ${
        dragOver ? "border-primary bg-muted/30" : "border-muted"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept={ALL_ALLOWED_MIMES.join(",")}
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
        }}
      />

      <div className="flex flex-col items-center gap-3">
        {state.active ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {state.processing
                ? `Processing ${state.totalCount} file(s)…`
                : `Uploading ${state.totalCount} file(s)…`}
            </p>
            <div className="w-full max-w-md">
              <Progress value={state.progress} />
            </div>
          </>
        ) : (
          <>
            <UploadCloud className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Drop files here, or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">
                Up to {formatBytes(maxFileSize)} per file. Images, video, and
                documents.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm">
              Choose files
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
