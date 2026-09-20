import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import ProductCard from "../ProductCard";

export const revalidate = 0;

export default async function Vitrine() {
  const supabase = await createClient();
  const { data: products } = await supabase.from("products").select("*").order("created_at", { ascending: false });

  const categories = ["SkinCare", "Maquiagem", "Cabelos", "Suplementos", "Geral"];
  const groupedProducts: Record<string, any[]> = {};
  categories.forEach(c => groupedProducts[c] = []);

  products?.forEach(product => {
    const cat = product.category || "Geral";
    if (groupedProducts[cat]) {
      groupedProducts[cat].push(product);
    } else {
      groupedProducts["Geral"].push(product);
    }
  });

  const activeCategories = categories.filter(c => groupedProducts[c].length > 0);

  return (
    <div className="min-h-screen bg-[var(--color-wine-dark)] flex flex-col font-sans">
      <main className="flex-1 max-w-6xl w-full mx-auto p-8 relative z-10 pt-16">
        <div className="mb-12">
          <Link href="/" className="text-[var(--color-gold)] hover:text-white transition-colors">
            &larr; Voltar para a Home
          </Link>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-serif text-[var(--color-gold)] mb-4">A Coleção Lunar</h1>
          <p className="text-[var(--color-gold-light)] opacity-70 text-lg max-w-2xl mx-auto mb-8">
            Meus segredos de beleza organizados por categorias. Tudo testado, aprovado e amado por mim.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {activeCategories.map(cat => (
              <a key={cat} href={`#${cat.replace(/\s+/g, "-")}`} className="border border-[var(--color-wine-light)] text-[var(--color-gold)] px-4 py-2 rounded-full text-sm uppercase tracking-widest hover:bg-[var(--color-wine)] transition-colors">
                {cat}
              </a>
            ))}
          </div>
        </div>

        {activeCategories.map(category => {
          const categoryProducts = groupedProducts[category];
          return (
            <div key={category} id={category.replace(/\s+/g, "-")} className="mb-20 pt-8 scroll-mt-8">
              <h2 className="text-3xl font-serif text-[var(--color-gold)] border-b border-[var(--color-wine-light)] pb-4 mb-8">
                {category}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {categoryProducts.map((produto: any) => (
                  <ProductCard key={produto.id} produto={produto} />
                ))}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
