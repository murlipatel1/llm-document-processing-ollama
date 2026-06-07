import Skeleton from "@/components/ui/Skeleton";

type Props = {
  count?: number;
};

export default function DocumentListSkeleton({ count = 3 }: Props) {
  return (
    <ul className="doc-list skeleton-list" aria-busy="true" aria-label="Loading documents">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="doc-card skeleton-doc-card">
          <Skeleton className="skeleton-doc-icon" />
          <div className="doc-card-body">
            <Skeleton className="skeleton-doc-title" />
            <Skeleton className="skeleton-doc-meta" />
          </div>
          <Skeleton className="skeleton-doc-action" />
        </li>
      ))}
    </ul>
  );
}
