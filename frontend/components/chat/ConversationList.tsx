"use client";

import { useEffect, useState } from "react";

type Conversation = {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
};

type Props = {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onNewChat: () => void;
};

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
  onDelete,
  onNewChat
}: Props) {
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingDelete) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deletingId) setPendingDelete(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingDelete, deletingId]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    setDeleteError(null);
    setDeletingId(pendingDelete.id);
    try {
      await onDelete(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      setDeleteError("Could not delete this conversation. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <aside className="conversation-panel" aria-label="Conversation history">
      <div className="conversation-panel-header">
        <div>
          <h3 className="conversation-panel-title">History</h3>
          <p className="conversation-panel-subtitle">
            {conversations.length
              ? `${conversations.length} saved chat${conversations.length === 1 ? "" : "s"}`
              : "No saved chats yet"}
          </p>
        </div>
        <button type="button" className="secondary-btn conversation-new-btn" onClick={onNewChat}>
          + New
        </button>
      </div>

      {conversations.length ? (
        <ul className="conversation-list" role="list">
          {conversations.map((conversation) => {
            const isActive = conversation.id === activeConversationId;
            const isDeleting = deletingId === conversation.id;

            return (
              <li key={conversation.id} className="conversation-list-item">
                <div
                  className={`conversation-item${isActive ? " is-active" : ""}${isDeleting ? " is-deleting" : ""}`}
                >
                  <button
                    type="button"
                    className="conversation-item-main"
                    onClick={() => onSelect(conversation.id)}
                    disabled={Boolean(deletingId)}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <span className="conversation-item-title">
                      {conversation.title || "Untitled conversation"}
                    </span>
                    {conversation.lastMessage ? (
                      <span className="conversation-item-preview">{conversation.lastMessage}</span>
                    ) : null}
                    <span className="conversation-item-meta">
                      {formatRelativeTime(conversation.updatedAt)}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="conversation-item-delete"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteError(null);
                      setPendingDelete(conversation);
                    }}
                    disabled={Boolean(deletingId)}
                    aria-label={`Delete ${conversation.title || "conversation"}`}
                    title="Delete conversation"
                  >
                    {isDeleting ? (
                      <span className="conversation-delete-spinner" aria-hidden="true" />
                    ) : (
                      <TrashIcon />
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="conversation-empty">
          <p>Start a new chat to build your history.</p>
          <button type="button" className="secondary-btn" onClick={onNewChat}>
            Start chatting
          </button>
        </div>
      )}

      {pendingDelete ? (
        <div
          className="conversation-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!deletingId) setPendingDelete(null);
          }}
        >
          <div
            className="conversation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-conversation-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="conversation-modal-icon" aria-hidden="true">
              <TrashIcon />
            </div>
            <h4 id="delete-conversation-title">Delete conversation?</h4>
            <p className="conversation-modal-text">
              <strong>{pendingDelete.title || "Untitled conversation"}</strong> will be removed
              permanently. Messages cannot be recovered.
            </p>
            {deleteError ? <p className="error-text conversation-modal-error">{deleteError}</p> : null}
            <div className="conversation-modal-actions">
              <button
                type="button"
                className="secondary-btn"
                disabled={Boolean(deletingId)}
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-btn"
                disabled={Boolean(deletingId)}
                onClick={confirmDelete}
              >
                {deletingId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
