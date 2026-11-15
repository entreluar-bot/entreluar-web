"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { JournalPost } from "../types";
import JournalCard from "../ui/JournalCard";
import FilterChipBar from "../ui/FilterChipBar";
import SmartTagFilters, { type SmartTagGroup } from "../ui/SmartTagFilters";
import HighlightStrip from "../ui/HighlightStrip";
import LoadMoreGrid from "../ui/LoadMoreGrid";
import { pickHighlights } from "@/lib/highlights";

type FilterKey = "all" | "featured" | "most-purchased" | "most-viewed" | "new" | `tag:${string}`;
type ReviewPost = JournalPost & { tagSlugs?: string[] };
type TagGroup = SmartTagGroup;

const specialFilters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "featured", label: "Meus destaques" },
  { key: "most-purchased", label: "Os mais queridos" },
  { key: "most-viewed", label: "Mais espiados" },
  { key: "new", label: "Novo" },
];

function FeaturedReview({ post }: { post: ReviewPost }) {
  const copy = post.content.replace(/<[^>]+>/g, "").slice(0, 170);
  return (
    <article className="featured-card luxe-card">
      {post.image_url && (
        <Link href={`/resenhas/${post.id}`} className="featured-card__media">
          <Image src={post.image_url} alt={post.title} fill sizes="(max-width:760px) 100vw,46vw" className="object-cover transition duration-700 hover:scale-105" unoptimized />
        </Link>
      )}
      <div className="featured-card__body">
        <p className="eyebrow">Estudei para te explicar • {new Date(post.created_at).toLocaleDateString("pt-BR")}</p>
        <h2 className="font-display mt-3 text-4xl leading-none text-[var(--champagne-pale)]">{post.title}</h2>
        <p className="muted my-4 text-sm leading-7">{copy}{post.content.length > 170 ? "…" : ""}</p>
        <Link href={`/resenhas/${post.id}`} className="ghost-button">Mais detalhes do que estudei →</Link>
      </div>
    </article>
  );
}

export default function ReviewFilters({ posts, tagGroups = [] }: { posts: ReviewPost[]; tagGroups?: TagGroup[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>({});
  const [appliedTags, setAppliedTags] = useState<Record<string, string[]>>({});
  const filteredPosts = useMemo(() => {
    const matchesSmartFilters = (post: ReviewPost) => tagGroups.every((group) => {
      const selected = appliedTags[group.key] || [];
      return !selected.length || selected.some((slug) => post.tagSlugs?.includes(slug));
    });
    const withSmartFilters = (items: ReviewPost[]) => items.filter(matchesSmartFilters);
    if (activeFilter === "featured") return withSmartFilters(posts.filter((post) => post.is_featured));
    if (activeFilter === "most-purchased") return withSmartFilters(posts.filter((post) => post.is_most_purchased));
    if (activeFilter === "most-viewed") return withSmartFilters(posts.filter((post) => post.is_most_viewed));
    if (activeFilter === "new") return withSmartFilters(posts.filter((post) => post.is_new));
    if (activeFilter.startsWith("tag:")) {
      const tagSlug = activeFilter.slice("tag:".length);
      return withSmartFilters(posts.filter((post) => post.tagSlugs?.includes(tagSlug)));
    }
    return withSmartFilters(posts);
  }, [activeFilter, posts, appliedTags, tagGroups]);
  const isDefaultView = activeFilter === "all" && !Object.values(appliedTags).some((slugs) => slugs.length > 0);
  const picks = useMemo(
    () => isDefaultView
      ? pickHighlights(posts).map(({ kind, item }) => ({
          kind,
          item: {
            id: item.id,
            title: item.title,
            image_url: item.image_url,
            excerpt: `${item.content.replace(/<[^>]+>/g, "").slice(0, 170)}${item.content.length > 170 ? "…" : ""}`,
            href: `/resenhas/${item.id}`,
            eyebrow: "Estudei para te explicar",
            cta: "Mais detalhes do que estudei →",
          },
        }))
      : [],
    [isDefaultView, posts],
  );
  const pickedIds = new Set(picks.map((pick) => pick.item.id));
  const listPosts = picks.length ? filteredPosts.filter((post) => !pickedIds.has(post.id)) : filteredPosts;
  const featuredPost = picks.length ? undefined : listPosts[0];
  const remainingPosts = picks.length ? listPosts : listPosts.slice(1);
  const toggleTag = (groupKey: string, slug: string) => setSelectedTags((previous) => {
    const selected = previous[groupKey] || [];
    return { ...previous, [groupKey]: selected.includes(slug) ? selected.filter((item) => item !== slug) : [...selected, slug] };
  });

  return (
    <section className="listing-flow" aria-label="Explicações filtradas">
      <details className="filter-drawer">
        <summary>Filtrar</summary>
        <div className="filter-drawer__panel">
          <p className="filter-drawer__label">Destaques</p>
          <FilterChipBar ariaLabel="Filtros de destaque" activeKey={activeFilter} onSelect={(key) => setActiveFilter(key as FilterKey)} options={specialFilters} compact />
          <SmartTagFilters groups={tagGroups.map((group) => ({ ...group, options: group.options.map((option) => ({ ...option, count: posts.filter((post) => post.tagSlugs?.includes(option.slug)).length })) }))} selected={selectedTags} onToggle={toggleTag} onApply={() => setAppliedTags(selectedTags)} onClear={() => { setSelectedTags({}); setAppliedTags({}); }} />
        </div>
      </details>

      <div className="mt-4" aria-live="polite">
        <p className="mb-3 text-sm text-[var(--muted)]">{filteredPosts.length} {filteredPosts.length === 1 ? "explicação nesta seleção" : "explicações nesta seleção"}</p>
        {filteredPosts.length ? (
          <>
            <HighlightStrip picks={picks} />
            {picks.length > 0 && remainingPosts.length > 0 && <h2 className="rest-title font-display">Mais para você entender</h2>}
            {featuredPost && <FeaturedReview post={featuredPost} />}
            <LoadMoreGrid noun="explicações" items={remainingPosts.map((post) => <JournalCard key={post.id} post={post} href={`/resenhas/${post.id}`} ctaLabel="Mais detalhes do que estudei →" />)} />
          </>
        ) : (
          <div className="empty-state">
            <span className="mb-3 block text-4xl">🔬</span>
            Nada por aqui ainda. Minha lupa continua trabalhando — sem pressa e sem achismo.
          </div>
        )}
      </div>
    </section>
  );
}
