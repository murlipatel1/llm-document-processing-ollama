"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { clearSession, getSession, saveSession } from "@/lib/auth";

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

async function getFreshAccessToken(): Promise<string> {
  const session = getSession();
  if (!session?.accessToken) return "";

  const payload = decodeJwtPayload(session.accessToken);
  const expiresAt = (payload?.exp ?? 0) * 1000;
  const isExpiringSoon = expiresAt - Date.now() < 60_000;

  if (isExpiringSoon && session.refreshToken) {
    try {
      const { data } = await api.post("/api/auth/refresh", {
        refreshToken: session.refreshToken
      });
      saveSession({ ...session, accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data.accessToken as string;
    } catch {
      clearSession();
      return "";
    }
  }

  return session.accessToken;
}

export type Message = {
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
  sources?: Array<{ documentId?: string; filename?: string; score?: number }>;
  historyUsed?: boolean;
  historyCount?: number;
};

type Conversation = {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
};

const ACTIVE_CONVERSATION_KEY = "enterprise-kb-active-conversation";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);

  const lastAssistantSources = useMemo(() => {
    const last = [...messages].reverse().find((msg) => msg.role === "assistant");
    return last?.sources || [];
  }, [messages]);

  const loadConversations = async () => {
    const { data } = await api.get("/api/chat/conversations");
    const items = data.items || [];
    setConversations(items);
    return items;
  };

  const loadConversation = async (conversationId: string) => {
    const { data } = await api.get(`/api/chat/conversations/${conversationId}`);
    setMessages(data.messages || []);
    setActiveConversationId(conversationId);
    setError(null);
    localStorage.setItem(ACTIVE_CONVERSATION_KEY, conversationId);
  };

  const startNewConversation = () => {
    setMessages([]);
    setActiveConversationId(null);
    setError(null);
    localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
  };

  const deleteConversation = async (conversationId: string) => {
    await api.delete(`/api/chat/conversations/${conversationId}`);
    if (activeConversationId === conversationId) startNewConversation();
    await loadConversations();
  };

  const ask = async (question: string) => {
    setError(null);
    setLastQuestion(question);
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setLoading(true);

    try {
      setMessages((prev) => [...prev, { role: "assistant", text: "", streaming: true }]);

      const accessToken = await getFreshAccessToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            question,
            conversationId: activeConversationId || undefined
          })
        }
      );

      if (response.status === 401) {
        clearSession();
        throw new Error("Session expired. Please log in again.");
      }
      if (!response.ok || !response.body) {
        throw new Error(`Chat request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedDone = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const line = chunk.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;

          const payload = JSON.parse(line.replace(/^data:\s*/, ""));

          if (payload.conversationId && payload.conversationId !== activeConversationId) {
            setActiveConversationId(payload.conversationId);
            localStorage.setItem(ACTIVE_CONVERSATION_KEY, payload.conversationId);
          }

          if (payload.token) {
            setMessages((prev) => {
              const next = [...prev];
              for (let i = next.length - 1; i >= 0; i -= 1) {
                if (next[i].role === "assistant") {
                  next[i] = { ...next[i], text: `${next[i].text}${payload.token}`, streaming: true };
                  break;
                }
              }
              return next;
            });
          }

          if (payload.done) {
            receivedDone = true;
            if (payload.error) {
              setError(payload.error);
            }
            setMessages((prev) => {
              const next = [...prev];
              for (let i = next.length - 1; i >= 0; i -= 1) {
                if (next[i].role === "assistant") {
                  next[i] = {
                    ...next[i],
                    text: next[i].text || payload.error || "No answer available.",
                    streaming: false,
                    sources: payload.sources || [],
                    historyUsed: payload.historyUsed || false,
                    historyCount: payload.historyCount || 0
                  };
                  break;
                }
              }
              return next;
            });
          }
        }
      }

      if (!receivedDone) {
        throw new Error("Chat stream ended unexpectedly. The model may be unavailable.");
      }

      await loadConversations();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      // Remove the empty assistant placeholder on hard failure
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.text) return prev.slice(0, -1);
        // Mark streaming false on existing assistant message
        return prev.map((m, i) =>
          i === prev.length - 1 && m.role === "assistant" ? { ...m, streaming: false } : m
        );
      });
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    if (lastQuestion) {
      // Remove last user + assistant pair if the ask failed silently
      setMessages((prev) => {
        const idx = [...prev].reverse().findIndex((m) => m.role === "user");
        if (idx === -1) return prev;
        const actualIdx = prev.length - 1 - idx;
        return prev.slice(0, actualIdx);
      });
      ask(lastQuestion);
    }
  };

  const dismissError = () => setError(null);

  useEffect(() => {
    loadConversations()
      .then((items) => {
        const savedConversation = localStorage.getItem(ACTIVE_CONVERSATION_KEY);
        const initialId = savedConversation || items[0]?.id;
        if (initialId) return loadConversation(initialId);
        return Promise.resolve();
      })
      .catch(() => undefined)
      .finally(() => setInitialLoading(false));
  }, []);

  return {
    messages,
    sources: lastAssistantSources,
    loading,
    initialLoading,
    error,
    ask,
    retry,
    dismissError,
    conversations,
    activeConversationId,
    loadConversation,
    startNewConversation,
    deleteConversation
  };
}
