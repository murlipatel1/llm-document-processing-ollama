import SearchSkeleton from "@/components/search/SearchSkeleton";

type SearchItem = {
  id: string;
  text: string;
  score?: number;
};

type Props = {
  items: SearchItem[];
  loading: boolean;
  error: string | null;
  hasSearched: boolean;
};

export default function SearchResult({ items, loading, error, hasSearched }: Props) {
  if (error) {
    return <p className="error-text">{error}</p>;
  }

  if (loading) {
    return <SearchSkeleton />;
  }

  if (!hasSearched) {
    return (
      <div className="search-empty doc-empty">
        <div className="doc-empty-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </div>
        <p className="doc-empty-title">Search your knowledge base</p>
        <p className="subtext">Enter a query above to find relevant document sections.</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="search-empty doc-empty">
        <div className="doc-empty-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="7" />
            <path d="M8 11h6" />
          </svg>
        </div>
        <p className="doc-empty-title">No results found</p>
        <p className="subtext">Try different keywords or upload more documents.</p>
      </div>
    );
  }

  return (
    <div className="search-results" style={{ display: "grid", gap: "0.7rem" }}>
      {items.map((item) => (
        <article key={item.id} className="search-item">
          {item.score ? <small className="search-score">Score: {item.score.toFixed(3)}</small> : null}
          <p style={{ marginBottom: 0 }}>{item.text}</p>
        </article>
      ))}
    </div>
  );
}
