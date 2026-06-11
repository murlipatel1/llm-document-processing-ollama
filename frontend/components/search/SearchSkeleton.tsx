import Skeleton from "@/components/ui/Skeleton";

type Props = {
  count?: number;
};

export default function SearchSkeleton({ count = 3 }: Props) {
  return (
    <div className="search-results skeleton-list" aria-busy="true" aria-label="Loading search results">
      {Array.from({ length: count }, (_, i) => (
        <article key={i} className="search-item skeleton-search-item">
          <Skeleton className="skeleton-search-score" />
          <Skeleton className="skeleton-search-line" />
          <Skeleton className="skeleton-search-line skeleton-search-line-short" />
        </article>
      ))}
    </div>
  );
}
