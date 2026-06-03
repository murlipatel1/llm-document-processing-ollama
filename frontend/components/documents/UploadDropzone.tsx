"use client";

import { useRef, useState } from "react";

type Props = {
  onUpload: (file: File) => Promise<void>;
};

const ACCEPTED = ".pdf,.doc,.docx,.txt";
const ACCEPTED_LABEL = "PDF, DOC, DOCX, TXT";

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

export default function UploadDropzone({ onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUploaded, setLastUploaded] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setLastUploaded(null);
    setLoading(true);
    try {
      await onUpload(file);
      setLastUploaded(file.name);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Upload failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="upload-section">
      <div
        className={`upload-dropzone${dragOver ? " is-dragover" : ""}${loading ? " is-loading" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => !loading && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-busy={loading}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="upload-input-hidden"
          disabled={loading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <div className="upload-dropzone-icon">
          {loading ? <span className="upload-spinner" aria-hidden="true" /> : <UploadIcon />}
        </div>
        <p className="upload-dropzone-title">
          {loading ? "Uploading..." : "Drop a file here or click to browse"}
        </p>
        <p className="upload-hint">Supported formats: {ACCEPTED_LABEL} · Max 50 MB</p>
        <div className="upload-format-tags">
          {["PDF", "DOC", "DOCX", "TXT"].map((tag) => (
            <span key={tag} className="upload-format-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {lastUploaded ? (
        <p className="upload-success" role="status">
          Uploaded <strong>{lastUploaded}</strong> — processing will start shortly.
        </p>
      ) : null}
      {error ? <p className="error-text upload-error">{error}</p> : null}
    </div>
  );
}
