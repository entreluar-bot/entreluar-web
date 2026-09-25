"use client";

import { useMemo, useState } from "react";
import type { JournalPost } from "../types";
import JournalCard from "../ui/JournalCard";
import FilterChipBar from "../ui/FilterChipBar";
import NewsletterSignup from "../ui/NewsletterSignup";

export const PAPO_FILTERS = [
  "Me escolhendo de novo",
  "Corpo em modo surpresa",
  "Pausa sem culpa",
  "Beleza sem tribunal",
  "Rindo para não surtar",
  "Confissões da maturidade",
] as const;

type PapoFilter = (typeof PAPO_FILTERS)[number];
type FilterKey = "all" | `papo:${PapoFilter}`;

function resolvePapoFilter(post: JournalPost): PapoFilter {
  const saved = post.papo_filter?.trim();
  if (PAPO_FILTERS.includes(saved as PapoFilter)) return saved as PapoFilter;
  if (post.category === "Confissões de Madrugada") return "Confissões da maturidade";
  if (post.category === "Sobrevivendo com Humor") return "Rindo para não surtar";
  return "Confissões da maturidade";
}

const filterCopy: Record<PapoFilter, string> = {
  "Me escolhendo de novo": "Recomeços, escolhas adultas e aquela coragem de parar de caber onde a alma apertou.",
  "Corpo em modo surpresa": "Hormônios, memória, visão, sono e outras novidades que ninguém colocou no manual.",
  "Pausa sem culpa": "Descanso, silêncio e o direito de não transformar cada minuto em produtividade.",
  "Beleza sem tribunal": "Cabelo, pele, espelho e escolhas estéticas sem patrulha nem pedido de desculpa.",
  "Rindo para não surtar": "Humor maduro para atravessar os dias em que a paciência sai antes da gente.",
  "Confissões da maturidade": "Histórias mais íntimas, bastidores e pensamentos que só aparecem quando a conversa esquenta.",
};

export default function BlogFilters({ posts }: { posts: JournalPost[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const filters = useMemo(
    () => PAPO_FILTERS.map((filter) => ({ key: `papo:${filter}` as FilterKey, label: filter, count: posts.filter((post) => resolvePapoFilter(post) === filter).length })),
    [posts],
  );
  const filteredPosts = useMemo(() => {
    if (activeFilter.startsWith("papo:")) {
      const filter = activeFilter.slice("papo:".length) as PapoFilter;
      return posts.filter((post) => resolvePapoFilter(post) === filter);
    }
    return posts;
  }, [activeFilter, posts]);
  const activeLabel = activeFilter === "all" ? "Todas as conversas" : activeFilter.slice("papo:".length);
  const firstPosts = filteredPosts.slice(0, 3);
  const remainingPosts = filteredPosts.slice(3);

  return (
    <section className="mt-6" aria-label="Conversas filtradas">
      <FilterChipBar
        ariaLabel="Filtros do Papo de Mulher Madura"
        activeKey={activeFilter}
        onSelect={(key) => setActiveFilter(key as FilterKey)}
        options={[{ key: "all" as FilterKey, label: "Todas as conversas", count: posts.length }, ...filters]}
        compact
      />
      <div className="mt-4" aria-live="polite">
        <p className="mb-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          {filteredPosts.length} {filteredPosts.length === 1 ? "papo nesta seleção" : "papos nesta seleção"}
          {activeFilter !== "all" && ` · ${filterCopy[activeLabel as PapoFilter]}`}
        </p>
        {filteredPosts.length ? (
          <>
            <div className="editorial-grid">
              {firstPosts.map((post) => <JournalCard key={post.id} post={post} href={`/blog/${post.id}`} />)}
            </div>
            <section className="newsletter-cta newsletter-cta--between-list" aria-labelledby="blog-newsletter-title">
              <div>
                <p className="eyebrow">Emails para mulheres 50+</p>
                <h2 id="blog-newsletter-title" className="font-display text-3xl leading-none text-[var(--champagne-pale)]">Fica por dentro, amiga.</h2>
                <p className="muted mt-3 leading-7">Receba novidades 50+, achados sinceros e nossos papos antes que eles se percam no feed.</p>
              </div>
              <NewsletterSignup source="blog-lista" />
            </section>
            {remainingPosts.length > 0 && (
              <div className="editorial-grid">
                {remainingPosts.map((post) => <JournalCard key={post.id} post={post} href={`/blog/${post.id}`} />)}
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            Nada por aqui ainda. Esse sentimento está reservado para uma próxima conversa boa.
          </div>
        )}
      </div>
    </section>
  );
}
