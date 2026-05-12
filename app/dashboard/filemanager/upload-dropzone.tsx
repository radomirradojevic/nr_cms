"use client";

import { useRef, useState } from "react";
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
};

type UploadState = {
  active: boolean;
  progress: number;
  totalCount: number;
  processing: boolean;
};

export function UploadDropzone({
  onUploaded,
  maxFileSize,
  maxBatchSize,
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

    const form = new FormData();
    for (const f of accepted) form.append("file", f);

    setState({
      active: true,
      progress: 0,
      totalCount: accepted.length,
      processing: false,
    });

    try {
      const xhr = new XMLHttpRequest();
      const result = await new Promise<{
        results: Array<
          | { ok: true; file: FileRow }
          | { ok: false; filename: string; error: string }
        >;
      }>((resolve, reject) => {
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
              resolve(JSON.parse(xhr.responseText));
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
