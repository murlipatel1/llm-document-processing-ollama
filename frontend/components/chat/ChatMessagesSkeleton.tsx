import Skeleton from "@/components/ui/Skeleton";

export default function ChatMessagesSkeleton() {
  return (
    <div className="chat-messages-skeleton" aria-busy="true" aria-label="Loading messages">
      <div className="message-row user">
        <Skeleton className="skeleton-message user" />
      </div>
      <div className="message-row assistant">
        <Skeleton className="skeleton-message assistant" />
      </div>
      <div className="message-row user">
        <Skeleton className="skeleton-message user short" />
      </div>
      <div className="message-row assistant">
        <Skeleton className="skeleton-message assistant tall" />
      </div>
    </div>
  );
}
