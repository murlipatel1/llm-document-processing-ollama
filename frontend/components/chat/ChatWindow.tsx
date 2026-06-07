"use client";

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import SourceCitations from "./SourceCitations";
import ConversationList from "./ConversationList";
import { useChat } from "@/hooks/useChat";

export default function ChatWindow() {
  const {
    messages,
    sources,
    loading,
    ask,
    conversations,
    activeConversationId,
    loadConversation,
    startNewConversation,
    deleteConversation
  } = useChat();

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <section className="card chat-layout">
      <header className="chat-layout-header">
        <div>
          <h2 className="page-header">Chat Assistant</h2>
          <p className="subtext">Ask questions across your tenant documents using local Ollama.</p>
        </div>
      </header>

      <div className="chat-layout-body">
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelect={loadConversation}
          onDelete={deleteConversation}
          onNewChat={startNewConversation}
        />

        <div className="chat-main">
          <div className="chat-surface">
            {messages.length ? (
              messages.map((msg, idx) => (
                <MessageBubble
                  key={`${msg.role}-${idx}`}
                  role={msg.role}
                  text={msg.text}
                  historyUsed={msg.historyUsed}
                  historyCount={msg.historyCount}
                />
              ))
            ) : (
              <div className="chat-empty-state">
                <p className="chat-empty-title">No messages yet</p>
                <p className="subtext">Ask a question about your uploaded documents to get started.</p>
              </div>
            )}
            <div ref={bottomRef} aria-hidden="true" />
          </div>
          <SourceCitations sources={sources} />
          <ChatInput onSend={ask} loading={loading} />
        </div>
      </div>
    </section>
  );
}
