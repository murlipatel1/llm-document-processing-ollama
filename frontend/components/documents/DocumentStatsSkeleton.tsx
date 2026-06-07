import Skeleton from "@/components/ui/Skeleton";

export default function DocumentStatsSkeleton() {
  return (
    <div className="doc-stats" aria-busy="true" aria-label="Loading statistics">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="doc-stat-card">
          <Skeleton className="skeleton-stat-value" />
          <Skeleton className="skeleton-stat-label" />
        </div>
      ))}
    </div>
  );
}
