"use client";

import { useMemo, useState } from "react";
import type { JournalPost } from "../types";
import JournalCard from "../ui/JournalCard";

type FilterKey = "all" | "featured" | "most-purchased" | "most-viewed" | `category:${string}`;

const specialFilters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "featured", label: "Em destaque" },
  { key: "most-purchased", label: "Mais comprados" },
  { key: "most-viewed", label: "Mais vistos" },
];

export default function ReviewFilters({ posts }: { posts: JournalPost[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const categories = useMemo(
    () => [...new Set(posts.map((post) => post.filter_category?.trim()).filter((category): category is string => Boolean(category)))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [posts],
  );
  const filteredPosts = useMemo(() => {
    if (activeFilter === "featured") return posts.filter((post) => post.is_featured);
    if (activeFilter === "most-purchased") return posts.filter((post) => post.is_most_purchased);
    if (activeFilter === "most-viewed") return posts.filter((post) => post.is_most_viewed);
    if (activeFilter.startsWith("category:")) {
      const category = activeFilter.slice("category:".length);
      return posts.filter((post) => post.filter_category?.trim() === category);
    }
    return posts;
  }, [activeFilter, posts]);
  const filters = [
    ...specialFilters,
    ...categories.map((category) => ({ key: `category:${category}` as FilterKey, label: category })),
  ];

  return (
    <>
      <div className="-mx-5 mt-8 overflow-x-auto px-5 pb-3 [scrollbar-width:none] md:mx-0 md:px-0" aria-label="Filtros das resenhas">
        <div className="flex min-w-max gap-2" role="group">
          {filters.map((filter) => {
            const active = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveFilter(filter.key)}
                className={`min-h-11 rounded-full border px-5 text-xs font-bold uppercase tracking-[.14em] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--champagne)] ${active ? "border-[var(--champagne)] bg-[var(--champagne)] text-[var(--ink)] shadow-[0_8px_30px_rgba(213,178,107,.2)]" : "border-[var(--line)] bg-white/[.03] text-[var(--champagne-pale)] hover:border-[var(--champagne)]/60"}`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6" aria-live="polite">
        <p className="mb-6 text-sm text-[var(--muted)]">{filteredPosts.length} {filteredPosts.length === 1 ? "resenha selecionada" : "resenhas selecionadas"}</p>
        {filteredPosts.length ? (
          <div className="editorial-grid">
            {filteredPosts.map((post) => <JournalCard key={post.id} post={post} href={`/resenhas/${post.id}`} />)}
          </div>
        ) : (
          <div className="empty-state">
            <span className="mb-3 block text-4xl">🔬</span>
            Ainda não há uma resenha marcada neste filtro. Minha lupa continua trabalhando.
          </div>
        )}
      </div>
    </>
  );
}
