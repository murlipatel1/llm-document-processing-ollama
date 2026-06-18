"use client";

import { useCallback, useRef, useState } from "react";

type UploadEntry = {
  id: string;
  file: File;
  progress: number;
  error: string | null;
  done: boolean;
};

type Props = {
  onUpload: (file: File, onProgress: (pct: number) => void) => Promise<void>;
};

const ACCEPTED = ".pdf,.doc,.docx,.txt,.md";
const ACCEPTED_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown"
]);
const MAX_BYTES = 50 * 1024 * 1024;

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 16V4m0 0 7 7m-7-7-7 7M4 20h16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

let idCounter = 0;
function uid() {
  idCounter += 1;
  return `upload-${idCounter}-${Date.now()}`;
}

export default function UploadDropzone({ onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState<UploadEntry[]>([]);

  const updateEntry = (id: string, patch: Partial<UploadEntry>) => {
    setQueue((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const processFile = useCallback(
    async (entry: UploadEntry) => {
      try {
        await onUpload(entry.file, (pct) => {
          updateEntry(entry.id, { progress: pct });
        });
        updateEntry(entry.id, { progress: 100, done: true });
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Upload failed.";
        updateEntry(entry.id, { error: msg });
      }
    },
    [onUpload]
  );

  const enqueueFiles = useCallback(
    (rawFiles: FileList | File[]) => {
      const files = Array.from(rawFiles);
      const valid: File[] = [];
      const errors: string[] = [];

      for (const f of files) {
        if (f.size > MAX_BYTES) {
          errors.push(`${f.name} exceeds 50 MB`);
          continue;
        }
        if (!ACCEPTED_MIMES.has(f.type) && !f.name.match(/\.(pdf|docx?|txt|md)$/i)) {
          errors.push(`${f.name} is not a supported format`);
          continue;
        }
        valid.push(f);
      }

      if (errors.length) {
        const id = uid();
        const synthetic = new File([], "__error__");
        setQueue((prev) => [
          ...prev,
          { id, file: synthetic, progress: 0, done: false, error: errors.join("; ") }
        ]);
        setTimeout(() => setQueue((prev) => prev.filter((e) => e.id !== id)), 6000);
      }

      if (!valid.length) return;

      const entries: UploadEntry[] = valid.map((f) => ({
        id: uid(),
        file: f,
        progress: 0,
        error: null,
        done: false
      }));

      setQueue((prev) => [...prev, ...entries]);

      for (const entry of entries) {
        processFile(entry);
      }

      if (inputRef.current) inputRef.current.value = "";
    },
    [processFile]
  );

  const activeCount = queue.filter((e) => !e.done && !e.error && e.file.name !== "__error__").length;
  const anyActive = activeCount > 0;

  const clearDone = () => {
    setQueue((prev) => prev.filter((e) => !e.done && !e.error));
  };

  const hasDoneOrError = queue.some((e) => e.done || e.error);

  return (
    <div className="upload-section">
      <div
        className={`upload-dropzone${dragOver ? " is-dragover" : ""}${anyActive ? " is-loading" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) enqueueFiles(e.dataTransfer.files);
        }}
        onClick={() => !anyActive && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); }
        }}
        role="button"
        tabIndex={0}
        aria-busy={anyActive}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="upload-input-hidden"
          disabled={anyActive}
          onChange={(e) => { if (e.target.files?.length) enqueueFiles(e.target.files); }}
        />
        <div className="upload-dropzone-icon">
          {anyActive
            ? <span className="upload-spinner" aria-hidden="true" />
            : <UploadIcon />}
        </div>
        <p className="upload-dropzone-title">
          {anyActive
            ? `Uploading ${activeCount} file${activeCount > 1 ? "s" : ""}…`
            : "Drop files here or click to browse"}
        </p>
        <p className="upload-hint">PDF, DOC, DOCX, TXT, MD · Max 50 MB · Multiple files supported</p>
        <div className="upload-format-tags">
          {["PDF", "DOCX", "TXT", "MD"].map((t) => (
            <span key={t} className="upload-format-tag">{t}</span>
          ))}
        </div>
      </div>

      {queue.length > 0 && (
        <ul className="upload-queue" role="list" aria-label="Upload queue">
          {queue.map((entry) => {
            if (entry.file.name === "__error__") {
              return (
                <li key={entry.id} className="upload-queue-item is-error">
                  <span className="upload-queue-icon is-error"><XIcon /></span>
                  <span className="upload-queue-name">{entry.error}</span>
                </li>
              );
            }
            return (
              <li
                key={entry.id}
                className={`upload-queue-item${entry.done ? " is-done" : entry.error ? " is-error" : ""}`}
              >
                <span className={`upload-queue-icon${entry.done ? " is-done" : entry.error ? " is-error" : ""}`}>
                  {entry.done
                    ? <CheckIcon />
                    : entry.error
                      ? <XIcon />
                      : <span className="upload-progress-spinner" aria-hidden="true" />}
                </span>
                <div className="upload-queue-info">
                  <span className="upload-queue-name" title={entry.file.name}>
                    {entry.file.name}
                  </span>
                  {!entry.done && !entry.error && (
                    <div className="upload-progress-bar-wrap" role="progressbar" aria-valuenow={entry.progress} aria-valuemin={0} aria-valuemax={100}>
                      <div className="upload-progress-bar" style={{ width: `${entry.progress}%` }} />
                    </div>
                  )}
                  {entry.error && (
                    <span className="upload-queue-error">{entry.error}</span>
                  )}
                  {entry.done && (
                    <span className="upload-queue-done">Queued for processing</span>
                  )}
                </div>
                <span className="upload-queue-pct">
                  {entry.done ? "100%" : entry.error ? "" : `${entry.progress}%`}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {hasDoneOrError && !anyActive && (
        <button type="button" className="secondary-btn upload-clear-btn" onClick={clearDone}>
          Clear completed
        </button>
      )}
    </div>
  );
}
