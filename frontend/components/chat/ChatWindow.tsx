"use client";

import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import SourceCitations from "./SourceCitations";
import { useChat } from "@/hooks/useChat";

export default function ChatWindow() {
  const { messages, sources, loading, ask, conversations, activeConversationId, loadConversation } = useChat();

  return (
    <section className="card">
      <h2 className="page-header">Chat Assistant</h2>
      <p className="subtext">Ask questions across your tenant documents using local Ollama.</p>
      {conversations.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.8rem" }}>
          {conversations.map((conversation) => (
            <button
              type="button"
              key={conversation.id}
              className={conversation.id === activeConversationId ? "secondary-btn" : ""}
              onClick={() => loadConversation(conversation.id)}
              style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              title={conversation.title || "Conversation"}
            >
              {conversation.title || "Conversation"}
            </button>
          ))}
        </div>
      ) : null}
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
