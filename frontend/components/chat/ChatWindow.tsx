"use client";

import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import SourceCitations from "./SourceCitations";
import { useChat } from "@/hooks/useChat";

export default function ChatWindow() {
  const { messages, sources, loading, ask } = useChat();

  return (
    <section className="card">
      <h2 className="page-header">Chat Assistant</h2>
      <p className="subtext">Ask questions across your tenant documents using local Ollama.</p>
      <div className="chat-surface">
        {messages.map((msg, idx) => (
          <MessageBubble key={`${msg.role}-${idx}`} role={msg.role} text={msg.text} />
        ))}
      </div>
      <SourceCitations sources={sources} />
      <ChatInput onSend={ask} loading={loading} />
    </section>
  );
}
