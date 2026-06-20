"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import ChatMessagesSkeleton from "./ChatMessagesSkeleton";
import SourceCitations from "./SourceCitations";
import ConversationList from "./ConversationList";
import ConversationListSkeleton from "./ConversationListSkeleton";
import { useChat } from "@/hooks/useChat";

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function ChatWindow() {
  const searchParams = useSearchParams();
  const prefillQuestion = searchParams.get("q") ?? "";

  const {
    messages,
    sources,
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

      {error && (
        <div className="chat-error-banner" role="alert">
          <AlertIcon />
          <span className="chat-error-text">{error}</span>
          <div className="chat-error-actions">
            <button type="button" className="chat-error-retry-btn" onClick={retry} disabled={loading}>
              Retry
            </button>
            <button type="button" className="chat-error-dismiss-btn" onClick={dismissError} aria-label="Dismiss error">
              <XSmallIcon />
            </button>
          </div>
        </div>
      )}

      <div className="chat-layout-body">
        {initialLoading ? (
          <ConversationListSkeleton />
        ) : (
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelect={loadConversation}
            onDelete={deleteConversation}
            onNewChat={startNewConversation}
          />
        )}

        <div className="chat-main">
          <div className="chat-surface">
            {initialLoading ? (
              <ChatMessagesSkeleton />
            ) : messages.length ? (
              messages.map((msg, idx) => (
                <MessageBubble
                  key={`${msg.role}-${idx}`}
                  role={msg.role}
                  text={msg.text}
                  streaming={msg.streaming}
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
          <ChatInput onSend={ask} loading={loading || initialLoading} initialValue={prefillQuestion} />
        </div>
      </div>
    </section>
  );
}
