type Props = {
  sources: Array<string | { filename?: string; score?: number }>;
};

export default function SourceCitations({ sources }: Props) {
  if (!sources.length) return null;

  return (
    <details style={{ marginTop: "0.6rem" }}>
      <summary>Sources</summary>
      <ul>
        {sources.map((source) => (
          <li key={typeof source === "string" ? source : `${source.filename || "source"}-${source.score || 0}`}>
            {typeof source === "string"
              ? source
              : `${source.filename || "Unknown file"}${source.score ? ` (score ${source.score.toFixed(3)})` : ""}`}
          </li>
        ))}
      </ul>
    </details>
  );
}
