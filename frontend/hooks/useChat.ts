"use client";

import { useState } from "react";
import { api } from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  text: string;
};

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const ask = async (question: string) => {
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setLoading(true);
    try {
      const { data } = await api.post("/api/chat", { question });
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer || "No answer available." }]);
      setSources(data.sources || []);
    } finally {
      setLoading(false);
    }
  };

  return { messages, sources, loading, ask };
}
