"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import ProductCard from "../ProductCard";
import type { Product } from "../types";
import FilterChipBar from "../ui/FilterChipBar";

type FilterKey = "all" | "featured" | "most-purchased" | "most-viewed" | `category:${string}` | `tag:${string}`;
type FilterableProduct = Product & { tagSlugs?: string[] };
type TagGroup = { label: string; options: Array<{ slug: string; name: string }> };

const specialFilters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Tudo" },
  { key: "featured", label: "Meus destaques" },
  { key: "most-purchased", label: "Os mais queridos" },
  { key: "most-viewed", label: "Mais espiados" },
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
          <Link href={`/vitrine/${product.id}`} className="ghost-button flex-1">{isStyle ? "Ver os detalhes" : "Minha opinião"}</Link>
          <a href={product.shopee_link} target="_blank" rel="noreferrer" className="luxe-button flex-1">Ver onde achei ↗</a>
        </div>
      </div>
    </article>
  );
}

export default function ProductFilters({ products, tagGroups = [] }: { products: FilterableProduct[]; tagGroups?: TagGroup[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category?.trim() || "Geral"))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [products],
  );
  const filteredProducts = useMemo(() => {
    if (activeFilter === "featured") return products.filter((product) => product.is_featured);
    if (activeFilter === "most-purchased") return products.filter((product) => product.is_most_purchased);
    if (activeFilter === "most-viewed") return products.filter((product) => product.is_most_viewed);
    if (activeFilter.startsWith("category:")) {
      const category = activeFilter.slice("category:".length);
      return products.filter((product) => (product.category?.trim() || "Geral") === category);
    }
    if (activeFilter.startsWith("tag:")) {
      const tagSlug = activeFilter.slice("tag:".length);
      return products.filter((product) => product.tagSlugs?.includes(tagSlug));
    }
    return products;
  }, [activeFilter, products]);

  const filters = [
    ...specialFilters,
    ...categories.map((category) => ({ key: `category:${category}` as FilterKey, label: category })),
  ];
  const featuredProduct = filteredProducts[0];
  const remainingProducts = filteredProducts.slice(1);
  const activeTagGroups = tagGroups.filter((group) => group.options.length > 0);

  return (
    <section className="listing-flow" aria-label="Achados filtrados">
      <details className="filter-drawer">
        <summary>Filtrar</summary>
        <div className="filter-drawer__panel">
          <p className="filter-drawer__label">Tipo de achado</p>
          <FilterChipBar ariaLabel="Filtros dos achados" activeKey={activeFilter} onSelect={(key) => setActiveFilter(key as FilterKey)} options={filters} compact />
          {activeTagGroups.map((group) => (
            <div key={group.label} className="mt-3">
              <p className="filter-drawer__label">{group.label}</p>
              <FilterChipBar
                ariaLabel={group.label}
                activeKey={activeFilter}
                onSelect={(key) => setActiveFilter(key as FilterKey)}
                options={group.options.map((option) => ({
                  key: `tag:${option.slug}` as FilterKey,
                  label: option.name,
                  count: products.filter((product) => product.tagSlugs?.includes(option.slug)).length,
                }))}
                compact
              />
            </div>
          ))}
        </div>
      </details>

      <div className="mt-4" aria-live="polite">
        <p className="mb-3 text-sm text-[var(--muted)]">{filteredProducts.length} {filteredProducts.length === 1 ? "achado nesta seleção" : "achados nesta seleção"}</p>
        {featuredProduct ? (
          <>
            <FeaturedProduct product={featuredProduct} />
            {remainingProducts.length > 0 && (
              <div className="editorial-grid">
                {remainingProducts.map((product) => <ProductCard key={product.id} produto={product} />)}
              </div>
            )}
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
