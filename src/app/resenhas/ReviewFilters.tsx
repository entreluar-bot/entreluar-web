"use client";

import { useMemo, useState } from "react";
import type { JournalPost } from "../types";
import JournalCard from "../ui/JournalCard";
import FilterChipBar from "../ui/FilterChipBar";

type FilterKey = "all" | "featured" | "most-purchased" | "most-viewed" | `category:${string}` | `tag:${string}`;
type ReviewPost = JournalPost & { tagSlugs?: string[] };
type TagGroup = { label: string; options: Array<{ slug: string; name: string }> };

const specialFilters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Todas as conversas" },
  { key: "featured", label: "Meus destaques" },
  { key: "most-purchased", label: "Os mais queridos" },
  { key: "most-viewed", label: "Mais espiados" },
];

export default function ReviewFilters({ posts, tagGroups = [] }: { posts: ReviewPost[]; tagGroups?: TagGroup[] }) {
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
    if (activeFilter.startsWith("tag:")) {
      const tagSlug = activeFilter.slice("tag:".length);
      return posts.filter((post) => post.tagSlugs?.includes(tagSlug));
    }
    return posts;
  }, [activeFilter, posts]);
  const filters = [
    ...specialFilters,
    ...categories.map((category) => ({ key: `category:${category}` as FilterKey, label: category })),
  ];

  return (
    <>
      <FilterChipBar ariaLabel="Filtros das resenhas" activeKey={activeFilter} onSelect={(key) => setActiveFilter(key as FilterKey)} options={filters} compact />

      {tagGroups.filter((group) => group.options.length > 0).map((group) => (
        <div key={group.label} className="mt-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-[var(--muted)]">{group.label}</p>
          <FilterChipBar
            ariaLabel={group.label}
            activeKey={activeFilter}
            onSelect={(key) => setActiveFilter(key as FilterKey)}
            options={group.options.map((option) => ({
              key: `tag:${option.slug}` as FilterKey,
              label: option.name,
              count: posts.filter((post) => post.tagSlugs?.includes(option.slug)).length,
            }))}
            compact
          />
        </div>
      ))}

      <div className="mt-4" aria-live="polite">
        <p className="mb-4 text-sm text-[var(--muted)]">{filteredPosts.length} {filteredPosts.length === 1 ? "explicação nesta seleção" : "explicações nesta seleção"}</p>
        {filteredPosts.length ? (
          <div className="editorial-grid">
            {filteredPosts.map((post) => <JournalCard key={post.id} post={post} href={`/resenhas/${post.id}`} />)}
          </div>
        ) : (
          <div className="empty-state">
            <span className="mb-3 block text-4xl">🔬</span>
            Nada por aqui ainda. Minha lupa continua trabalhando — sem pressa e sem achismo.
          </div>
        )}
      </div>
    </>
  );
}
