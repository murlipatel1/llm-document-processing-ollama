import Skeleton from "@/components/ui/Skeleton";

export default function ConversationListSkeleton() {
  return (
    <aside className="conversation-panel" aria-busy="true" aria-label="Loading conversations">
      <div className="conversation-panel-header">
        <div>
          <h3 className="conversation-panel-title">History</h3>
          <Skeleton className="skeleton-conv-subtitle" />
        </div>
        <Skeleton className="skeleton-conv-btn" />
      </div>
      <ul className="conversation-list" role="list">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="conversation-list-item">
            <div className="conversation-item skeleton-conv-item">
              <Skeleton className="skeleton-conv-title" />
              <Skeleton className="skeleton-conv-preview" />
              <Skeleton className="skeleton-conv-meta" />
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
