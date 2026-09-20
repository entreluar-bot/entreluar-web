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

      <main className="flex-1 flex flex-col items-center justify-center p-8 relative z-10 pt-16">
        
        {/* Pílula do Dia - Hero Section */}
        {latestQuote && (
          <div className="w-full max-w-4xl mb-16 text-center animate-fade-in">
            <p className="text-[var(--color-gold-light)] opacity-70 uppercase tracking-widest text-sm font-bold mb-6">Pílula do Dia</p>
            <h1 className="text-3xl md:text-5xl font-serif text-[var(--color-gold)] mb-8 leading-tight italic">
              "{latestQuote.quote}"
            </h1>
            <Link href="/pilulas" className="inline-block border border-[var(--color-gold)] text-[var(--color-gold)] px-6 py-2 rounded-full text-xs uppercase tracking-widest hover:bg-[var(--color-gold)] hover:text-[var(--color-wine-dark)] transition-colors">
              Ler todas as pílulas
            </Link>
          </div>
        )}

        {/* Sobre a Luana */}
        <div className="w-full max-w-4xl bg-[var(--color-wine)] bg-opacity-80 p-8 md:p-12 rounded-xl shadow-2xl border border-[var(--color-wine-light)] mb-24 mt-8">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-shrink-0 relative group">
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-[var(--color-gold)] shadow-[0_0_30px_rgba(212,175,55,0.3)] transition-transform duration-500 group-hover:scale-105">
                <img src="/luana.jpg" alt="Luana" className="w-full h-full object-cover" />
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-serif text-[var(--color-gold)] mb-4">Bem-vinda, querida!</h2>
              <p className="text-md md:text-lg text-[var(--color-gold-light)] leading-relaxed mb-6 font-light">
                Eu sou a Luana. Criei a Entreluar porque acredito que a maturidade é a fase mais luminosa da mulher. Aqui, não escondemos as nossas marcas; nós cuidamos delas.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Link href="/vitrine" className="inline-block bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] px-6 py-3 rounded-full font-bold uppercase tracking-widest hover:scale-105 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all text-center text-sm">
                  Ver Coleção Lunar
                </Link>
                <Link href="/blog" className="inline-block border-2 border-[var(--color-gold)] text-[var(--color-gold)] px-6 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-[var(--color-wine-light)] transition-all text-center text-sm">
                  Ler o Diário
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Vitrine */}
        <section id="vitrine" className="w-full max-w-5xl pt-16 border-t border-[var(--color-wine-light)] mb-24">
          <h2 className="text-3xl font-serif text-[var(--color-gold)] text-center mb-4 uppercase tracking-widest">Destaques da Coleção</h2>
          <p className="text-center text-[var(--color-gold-light)] opacity-70 mb-12">Meus últimos achados favoritos</p>
          
          {(!products || products.length === 0) ? (
            <p className="text-center text-[var(--color-gold-light)] opacity-70">A vitrine está sendo preparada pelas estrelas...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((produto: any) => (
                <ProductCard key={produto.id} produto={produto} />
              ))}
            </div>
          )}
          
          <div className="text-center mt-12">
            <Link href="/vitrine" className="inline-block border border-[var(--color-gold)] text-[var(--color-gold)] px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-[var(--color-wine-light)] transition-all text-sm">
              Ver Coleção Completa
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
