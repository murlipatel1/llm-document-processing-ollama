type Source = string | { filename?: string; score?: number };

type Props = {
  sources: Source[];
};

export default function SourceCitations({ sources }: Props) {
  if (!sources.length) return null;

  return (
    <details className="sources-details">
      <summary className="sources-summary">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
        {sources.length} source{sources.length !== 1 ? "s" : ""}
      </summary>
      <ul className="sources-list">
        {sources.map((source) => {
          const key = typeof source === "string" ? source : `${source.filename}-${source.score}`;
          const label =
            typeof source === "string"
              ? source
              : source.filename || "Unknown file";
          const score = typeof source === "object" ? source.score : undefined;

          return (
            <li key={key} className="sources-item">
              <span className="sources-filename">{label}</span>
              {score != null ? (
                <span className="sources-score" title="Relevance score">
                  {(score * 100).toFixed(0)}%
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
