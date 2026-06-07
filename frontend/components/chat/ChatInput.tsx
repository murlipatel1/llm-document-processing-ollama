"use client";

import { FormEvent, useState } from "react";

type Props = {
  onSend: (question: string) => Promise<void>;
  loading: boolean;
};

export default function ChatInput({ onSend, loading }: Props) {
  const [question, setQuestion] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setQuestion("");
    try {
      await onSend(trimmed);
    } catch {
      setQuestion(trimmed);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", marginTop: "0.95rem" }}>
      <input
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Ask about your enterprise documents..."
        style={{ flex: 1 }}
      />
      <button type="submit" disabled={loading}>
        {loading ? "Asking..." : "Send"}
      </button>
    </form>
  );
}
