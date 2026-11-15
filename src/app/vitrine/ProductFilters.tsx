"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import ProductCard from "../ProductCard";
import type { Product } from "../types";
import FilterChipBar from "../ui/FilterChipBar";
import SmartTagFilters, { type SmartTagGroup } from "../ui/SmartTagFilters";
import HighlightStrip from "../ui/HighlightStrip";
import LoadMoreGrid from "../ui/LoadMoreGrid";
import { pickHighlights } from "@/lib/highlights";

type FilterKey = "all" | "featured" | "most-purchased" | "most-viewed" | "new" | `category:${string}` | `tag:${string}`;
type FilterableProduct = Product & { tagSlugs?: string[] };
type TagGroup = SmartTagGroup;

const specialFilters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Tudo" },
  { key: "featured", label: "Meus destaques" },
  { key: "most-purchased", label: "Os mais queridos" },
  { key: "most-viewed", label: "Mais espiados" },
  { key: "new", label: "Novo" },
];

function FeaturedProduct({ product }: { product: FilterableProduct }) {
  const excerpt = product.description.replace(/<[^>]*>?/gm, "").slice(0, 170);
  const isStyle = product.category === "Acessórios" || product.category === "Roupas";

  return (
    <article className="featured-card luxe-card">
      <Link href={`/vitrine/${product.id}`} className="featured-card__media">
        {product.image_url ? <Image src={product.image_url} alt={product.title} fill sizes="(max-width:760px) 100vw,46vw" className="object-cover transition duration-700 hover:scale-105" unoptimized /> : <div className="grid h-full place-items-center bg-[#240910] text-5xl text-[var(--champagne)]">✨</div>}
      </Link>
      <div className="featured-card__body">
        <p className="eyebrow">{product.category || "Escolha da Luana"}</p>
        <h2 className="font-display mt-3 text-4xl leading-none text-[var(--champagne-pale)]">{product.title}</h2>
        {product.price && <p className="mt-3 font-bold text-[var(--champagne)]">{product.price}</p>}
        <p className="muted my-4 text-sm leading-7">{excerpt}{product.description.length > 170 ? "…" : ""}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href={`/vitrine/${product.id}`} className="ghost-button flex-1">{isStyle ? "Ver os detalhes" : "Meu veredito sincero"}</Link>
          <a href={product.shopee_link} target="_blank" rel="noreferrer" className="luxe-button flex-1">Quer o seu? Clica aqui ↗</a>
        </div>
      </div>
    </article>
  );
}

export default function ProductFilters({ products, tagGroups = [] }: { products: FilterableProduct[]; tagGroups?: TagGroup[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>({});
  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category?.trim() || "Geral"))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [products],
  );
  const filteredProducts = useMemo(() => {
    const matchesSmartFilters = (product: FilterableProduct) => tagGroups.every((group) => {
      const selected = selectedTags[group.key] || [];
      return !selected.length || selected.some((slug) => product.tagSlugs?.includes(slug));
    });
    const withSmartFilters = (items: FilterableProduct[]) => items.filter(matchesSmartFilters);
    if (activeFilter === "featured") return withSmartFilters(products.filter((product) => product.is_featured));
    if (activeFilter === "most-purchased") return withSmartFilters(products.filter((product) => product.is_most_purchased));
    if (activeFilter === "most-viewed") return withSmartFilters(products.filter((product) => product.is_most_viewed));
    if (activeFilter === "new") return withSmartFilters(products.filter((product) => product.is_new));
    if (activeFilter.startsWith("category:")) {
      const category = activeFilter.slice("category:".length);
      return withSmartFilters(products.filter((product) => (product.category?.trim() || "Geral") === category));
    }
    if (activeFilter.startsWith("tag:")) {
      const tagSlug = activeFilter.slice("tag:".length);
      return withSmartFilters(products.filter((product) => product.tagSlugs?.includes(tagSlug)));
    }
    return withSmartFilters(products);
  }, [activeFilter, products, selectedTags, tagGroups]);

  const filters = [
    ...specialFilters,
    ...categories.map((category) => ({ key: `category:${category}` as FilterKey, label: category })),
  ];
  const isDefaultView = activeFilter === "all";
  const picks = useMemo(
    () => isDefaultView
      ? pickHighlights(products).map(({ kind, item }) => {
          const text = item.description.replace(/<[^>]*>?/gm, "");
          return {
            kind,
            item: {
              id: item.id,
              title: item.title,
              image_url: item.image_url,
              excerpt: `${text.slice(0, 170)}${text.length > 170 ? "…" : ""}`,
              href: `/vitrine/${item.id}`,
              eyebrow: item.category || "Escolha da Luana",
              cta: "Quero ver →",
            },
          };
        })
      : [],
    [isDefaultView, products],
  );
  const pickedIds = new Set(picks.map((pick) => pick.item.id));
  const listProducts = picks.length ? filteredProducts.filter((product) => !pickedIds.has(product.id)) : filteredProducts;
  const featuredProduct = picks.length ? undefined : listProducts[0];
  const remainingProducts = picks.length ? listProducts : listProducts.slice(1);
  const toggleTag = (groupKey: string, slug: string) => setSelectedTags((previous) => {
    const selected = previous[groupKey] || [];
    return { ...previous, [groupKey]: selected.includes(slug) ? selected.filter((item) => item !== slug) : [...selected, slug] };
  });

  return (
    <section className="listing-flow" aria-label="Achados filtrados">
      <details className="filter-drawer">
        <summary>Filtrar</summary>
        <div className="filter-drawer__panel">
          <p className="filter-drawer__label">Tipo de achado</p>
          <FilterChipBar ariaLabel="Filtros dos achados" activeKey={activeFilter} onSelect={(key) => setActiveFilter(key as FilterKey)} options={filters} compact />
          <SmartTagFilters groups={tagGroups.map((group) => ({ ...group, options: group.options.map((option) => ({ ...option, count: products.filter((product) => product.tagSlugs?.includes(option.slug)).length })) }))} selected={selectedTags} onToggle={toggleTag} onClear={() => setSelectedTags({})} />
        </div>
      </details>

      <div className="mt-4" aria-live="polite">
        <p className="mb-3 text-sm text-[var(--muted)]">{filteredProducts.length} {filteredProducts.length === 1 ? "achado nesta seleção" : "achados nesta seleção"}</p>
        {filteredProducts.length ? (
          <>
            <HighlightStrip picks={picks} />
            {picks.length > 0 && remainingProducts.length > 0 && <h2 className="rest-title font-display">Mais achados para você</h2>}
            {featuredProduct && <FeaturedProduct product={featuredProduct} />}
            <LoadMoreGrid noun="achados" items={remainingProducts.map((product) => <ProductCard key={product.id} produto={product} />)} />
          </>
        ) : (
          <div className="empty-state">
            <span className="mb-3 block text-4xl">◇</span>
            Nada por aqui ainda. Minha bancada continua em investigação. ✨
          </div>
        )}
      </div>
    </section>
  );
}
