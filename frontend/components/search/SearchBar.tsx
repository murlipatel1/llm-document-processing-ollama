"use client";

import { FormEvent, useState } from "react";

type Props = {
  onSearch: (query: string) => Promise<void>;
  loading: boolean;
};

export default function SearchBar({ onSearch, loading }: Props) {
  const [query, setQuery] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    await onSearch(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.55rem", marginBottom: "1rem" }}>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search knowledge base" />
      <button type="submit">{loading ? "Searching..." : "Search"}</button>
    </form>
  );
}
