"use client";

import { useMemo, useState } from "react";
import ProductCard from "../ProductCard";
import type { Product } from "../types";

type FilterKey = "all" | "featured" | "most-purchased" | "most-viewed" | `category:${string}`;

const specialFilters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "featured", label: "Em destaque" },
  { key: "most-purchased", label: "Mais comprados" },
  { key: "most-viewed", label: "Mais vistos" },
];

export default function ProductFilters({ products }: { products: Product[] }) {
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
    return products;
  }, [activeFilter, products]);

  const filters = [
    ...specialFilters,
    ...categories.map((category) => ({ key: `category:${category}` as FilterKey, label: category })),
  ];

  return (
    <>
      <div className="-mx-5 mt-8 overflow-x-auto px-5 pb-3 [scrollbar-width:none] md:mx-0 md:px-0" aria-label="Filtros dos achados">
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
        <p className="mb-6 text-sm text-[var(--muted)]">{filteredProducts.length} {filteredProducts.length === 1 ? "achado selecionado" : "achados selecionados"}</p>
        {filteredProducts.length > 0 ? (
          <div className="editorial-grid">
            {filteredProducts.map((product) => <ProductCard key={product.id} produto={product} />)}
          </div>
        ) : (
          <div className="empty-state">
            <span className="mb-3 block text-4xl">◇</span>
            Ainda não marquei nenhum achado para este filtro. Minha curadoria continua por aqui. ✨
          </div>
        )}
      </div>
    </>
  );
}
