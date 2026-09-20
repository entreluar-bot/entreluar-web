import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import ProductCard from "./ProductCard";

export const revalidate = 0;

export default async function Home() {
  const supabase = await createClient();
  const { data: products } = await supabase.from("products").select("*").order("created_at", { ascending: false }).limit(3);
  const { data: latestQuote } = await supabase.from("quotes").select("*").order("created_at", { ascending: false }).limit(1).single();

  return (
    <div className="min-h-screen bg-[var(--color-wine-dark)] flex flex-col font-sans">
      <div className="absolute inset-0 bg-stars opacity-30 pointer-events-none"></div>

      <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 relative z-10 pt-16">
        
        {/* Pílula do Dia - Balão de Fala da Luana */}
        {latestQuote && (
          <div className="w-full max-w-3xl mb-16 animate-fade-in mt-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              
              <div className="flex-shrink-0 relative group md:mt-4 z-20">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-[var(--color-gold)] shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                  <img src="/luana.jpg" alt="Luana" className="w-full h-full object-cover" />
                </div>
              </div>

              <div className="flex-1 relative">
                <div className="hidden md:block absolute top-12 -left-4 w-4 h-4 bg-[var(--color-wine)] rotate-45 border-l border-b border-[var(--color-gold)]"></div>
                <div className="block md:hidden absolute -top-4 left-1/2 -translate-x-1/2 w-4 h-4 bg-[var(--color-wine)] rotate-45 border-l border-t border-[var(--color-gold)]"></div>
                
                <div className="bg-[var(--color-wine)] p-6 md:p-8 rounded-2xl md:rounded-3xl border border-[var(--color-gold)] shadow-xl relative z-10 text-center md:text-left">
                  <p className="text-[var(--color-gold-light)] opacity-70 uppercase tracking-widest text-[10px] md:text-xs font-bold mb-3">Luana diz:</p>
                  <h1 className="text-xl md:text-3xl font-serif text-[var(--color-gold)] mb-6 leading-relaxed italic">
                    "{latestQuote.quote}"
                  </h1>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                    <Link href="/pilulas" className="inline-block bg-[var(--color-gold)] text-[var(--color-wine-dark)] px-5 py-2 rounded-full text-xs md:text-sm font-bold uppercase tracking-widest hover:scale-105 transition-transform text-center">
                      Mais Pílulas
                    </Link>
                    <Link href="/sobre" className="inline-block border border-[var(--color-gold)] text-[var(--color-gold)] px-5 py-2 rounded-full text-xs md:text-sm font-bold uppercase tracking-widest hover:bg-[var(--color-wine-light)] transition-colors text-center">
                      Boas Vindas (Nossa História)
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Vitrine */}
        <section id="vitrine" className="w-full max-w-5xl pt-12 md:pt-16 border-t border-[var(--color-wine-light)] mb-24">
          <h2 className="text-2xl md:text-3xl font-serif text-[var(--color-gold)] text-center mb-4 uppercase tracking-widest">Destaques da Coleção</h2>
          <p className="text-center text-[var(--color-gold-light)] opacity-70 mb-8 md:mb-12 text-sm md:text-base">Meus últimos achados favoritos</p>
          
          {(!products || products.length === 0) ? (
            <p className="text-center text-[var(--color-gold-light)] opacity-70">A vitrine está sendo preparada pelas estrelas...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 px-2 md:px-0">
              {products.map((produto: any) => (
                <ProductCard key={produto.id} produto={produto} />
              ))}
            </div>
          )}
          
          <div className="text-center mt-10 md:mt-12">
            <Link href="/vitrine" className="inline-block border border-[var(--color-gold)] text-[var(--color-gold)] px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-[var(--color-wine-light)] transition-all text-xs md:text-sm">
              Ver Coleção Completa
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
