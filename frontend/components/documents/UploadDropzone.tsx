"use client";

import { useState } from "react";

type Props = {
  onUpload: (file: File) => Promise<void>;
};

export default function UploadDropzone({ onUpload }: Props) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="upload-dropzone">
      <input
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setLoading(true);
          try {
            await onUpload(file);
          } finally {
            setLoading(false);
          }
        }}
      />
      <p className="upload-hint">{loading ? "Uploading..." : "Upload enterprise document (PDF, DOC, DOCX, TXT)"}</p>
    </div>
  );
}
