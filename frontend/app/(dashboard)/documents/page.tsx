"use client";

import UploadDropzone from "@/components/documents/UploadDropzone";
import DocumentList from "@/components/documents/DocumentList";
import { useDocuments } from "@/hooks/useDocuments";

export default function DocumentsPage() {
  const { items, loading, uploadDocument } = useDocuments();

  return (
    <section className="card">
      <h2 className="page-header">Documents</h2>
      <p className="subtext">Upload and monitor processing status for enterprise files.</p>
      <UploadDropzone onUpload={uploadDocument} />
      {loading ? <p className="subtext">Loading documents...</p> : <DocumentList items={items} />}
    </section>
  );
}
