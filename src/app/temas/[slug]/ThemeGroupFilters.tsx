"use client";

import { useMemo, useState } from "react";
import JournalCard from "../../ui/JournalCard";
import ProductCard from "../../ProductCard";
import FilterChipBar from "../../ui/FilterChipBar";
import type { JournalPost, Product } from "../../types";

export type ThemeItem =
  | { kind: "journal"; id: string; tagSlugs: string[]; post: JournalPost }
  | { kind: "product"; id: string; tagSlugs: string[]; product: Product };

export default function ThemeGroupFilters({
  items,
  tagOptions,
}: {
  items: ThemeItem[];
  tagOptions: Array<{ slug: string; name: string }>;
}) {
  const [activeTag, setActiveTag] = useState("all");
  const filteredItems = useMemo(
    () => (activeTag === "all" ? items : items.filter((item) => item.tagSlugs.includes(activeTag))),
    [activeTag, items],
  );
  const options = useMemo(
    () => [
      { key: "all", label: "Tudo no tema", count: items.length },
      ...tagOptions.map((tag) => ({ key: tag.slug, label: tag.name, count: items.filter((item) => item.tagSlugs.includes(tag.slug)).length })),
    ],
    [items, tagOptions],
  );

  return (
    <>
      <FilterChipBar ariaLabel="Filtrar por tag" activeKey={activeTag} onSelect={setActiveTag} options={options} />
      <div className="mt-6" aria-live="polite">
        <p className="mb-6 text-sm text-[var(--muted)]">{filteredItems.length} {filteredItems.length === 1 ? "achado neste tema" : "achados neste tema"}</p>
        {filteredItems.length ? (
          <div className="editorial-grid">
            {filteredItems.map((item) =>
              item.kind === "journal" ? (
                <JournalCard
                  key={`journal-${item.id}`}
                  post={item.post}
                  href={item.post.category === "Estudei para te explicar" ? `/resenhas/${item.id}` : `/blog/${item.id}`}
                />
              ) : (
                <ProductCard key={`product-${item.id}`} produto={item.product} />
              ),
            )}
          </div>
        ) : (
          <div className="empty-state">Ainda não tenho nada marcado por aqui. Volta em breve — estou organizando o acervo. ✨</div>
        )}
      </div>
    </>
  );
}
