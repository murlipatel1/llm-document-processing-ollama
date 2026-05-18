type Props = {
  sources: string[];
};

export default function SourceCitations({ sources }: Props) {
  if (!sources.length) return null;

  return (
    <details style={{ marginTop: "0.6rem" }}>
      <summary>Sources</summary>
      <ul>
        {sources.map((source) => (
          <li key={source}>{source}</li>
        ))}
      </ul>
    </details>
  );
}
