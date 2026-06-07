"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { clearSession, getSession, saveSession } from "@/lib/auth";

/**
 * Decode a JWT and return its payload (no signature verification — just parsing).
 */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

/**
 * Return a valid accessToken, refreshing proactively if it expires within
 * 60 seconds. The Axios interceptor in api.ts only fires for Axios requests,
 * so the raw SSE fetch must handle its own token freshness.
 */
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

type Message = {
  role: "user" | "assistant";
  text: string;
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
    localStorage.setItem(ACTIVE_CONVERSATION_KEY, conversationId);
  };

  const startNewConversation = () => {
    setMessages([]);
    setActiveConversationId(null);
    localStorage.removeItem(ACTIVE_CONVERSATION_KEY);
  };

  const deleteConversation = async (conversationId: string) => {
    await api.delete(`/api/chat/conversations/${conversationId}`);

    if (activeConversationId === conversationId) {
      startNewConversation();
    }

    await loadConversations();
  };

  const ask = async (question: string) => {
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setLoading(true);
    try {
      setMessages((prev) => [...prev, { role: "assistant", text: "" }]);

      const accessToken = await getFreshAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          question,
          conversationId: activeConversationId || undefined
        })
      });

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
          const line = chunk
            .split("\n")
            .find((l) => l.startsWith("data:"));
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
                  next[i] = { ...next[i], text: `${next[i].text}${payload.token}` };
                  break;
                }
              }
              return next;
            });
          }

          if (payload.done) {
            receivedDone = true;
            setMessages((prev) => {
              const next = [...prev];
              for (let i = next.length - 1; i >= 0; i -= 1) {
                if (next[i].role === "assistant") {
                  next[i] = {
                    ...next[i],
                    text: next[i].text || payload.error || "No answer available.",
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
        throw new Error("Chat stream ended unexpectedly");
      }

      await loadConversations();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations()
      .then((items) => {
        const savedConversation = localStorage.getItem(ACTIVE_CONVERSATION_KEY);
        const initialId = savedConversation || items[0]?.id;
        if (initialId) {
          return loadConversation(initialId);
        }
        return Promise.resolve();
      })
      .catch(() => undefined);
  }, []);

  return {
    messages,
    sources: lastAssistantSources,
    loading,
    ask,
    conversations,
    activeConversationId,
    loadConversation,
    startNewConversation,
    deleteConversation
  };
}
