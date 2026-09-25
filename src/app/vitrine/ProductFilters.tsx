"use client";

import { useMemo, useState } from "react";
import ProductCard from "../ProductCard";
import type { Product } from "../types";
import FilterChipBar from "../ui/FilterChipBar";

type FilterKey = "all" | "featured" | "most-purchased" | "most-viewed" | `category:${string}`;

const specialFilters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Tudo na bancada" },
  { key: "featured", label: "Meus destaques" },
  { key: "most-purchased", label: "Os mais queridos" },
  { key: "most-viewed", label: "Mais espiados" },
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
      <FilterChipBar ariaLabel="Filtros dos achados" activeKey={activeFilter} onSelect={(key) => setActiveFilter(key as FilterKey)} options={filters} />

      <div className="mt-6" aria-live="polite">
        <p className="mb-6 text-sm text-[var(--muted)]">{filteredProducts.length} {filteredProducts.length === 1 ? "achado nesta seleção" : "achados nesta seleção"}</p>
        {filteredProducts.length > 0 ? (
          <div className="editorial-grid">
            {filteredProducts.map((product) => <ProductCard key={product.id} produto={product} />)}
          </div>
        ) : (
          <div className="empty-state">
            <span className="mb-3 block text-4xl">◇</span>
            Nada por aqui ainda. Minha bancada continua em investigação. ✨
          </div>
        )}
      </div>
    </>
  );
}
