type SearchItem = {
  id: string;
  text: string;
  score?: number;
};

type Props = {
  items: SearchItem[];
};

export default function SearchResult({ items }: Props) {
  if (!items.length) return <p className="subtext">No search results yet.</p>;

  return (
    <div style={{ display: "grid", gap: "0.7rem" }}>
      {items.map((item) => (
        <article key={item.id} className="search-item">
          {item.score ? <small className="search-score">Score: {item.score.toFixed(3)}</small> : null}
          <p style={{ marginBottom: 0 }}>{item.text}</p>
        </article>
      ))}
    </div>
  );
}
