"use client";

import SearchBar from "@/components/search/SearchBar";
import SearchResult from "@/components/search/SearchResult";
import { useSearch } from "@/hooks/useSearch";

export default function SearchPage() {
  const { items, loading, error, hasSearched, search } = useSearch();

  return (
    <section className="card">
      <h2 className="page-header">Semantic Search</h2>
      <p className="subtext">Find relevant sections across indexed documents.</p>
      <SearchBar onSearch={search} loading={loading} />
      <SearchResult items={items} loading={loading} error={error} hasSearched={hasSearched} />
    </section>
  );
}
