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

      <main className="flex-1 flex flex-col items-center px-6 md:px-8 relative z-10 w-full mx-auto">
        
        {/* PRIMEIRA DOBRA (HERO) - FOCO EM CONVERSÃO E ELEGÂNCIA */}
        <div className="w-full min-h-[85vh] flex flex-col items-center justify-center py-10 md:py-16 text-center animate-fade-in mt-6 md:mt-8">
          
          {/* Logo / Título sutil */}
          <h2 className="text-[var(--color-gold)] font-serif text-3xl md:text-4xl mb-8 tracking-widest opacity-80">Entreluar</h2>

          {/* Frase / Pílula em Caixa de Diálogo */}
          {latestQuote && (
            <div className="flex flex-col md:flex-row items-center md:items-start gap-5 md:gap-6 w-full max-w-2xl mx-auto mb-12 px-2">
              <div className="flex-shrink-0 relative group z-20 md:mt-2">
                <div className="w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-[var(--color-gold)] shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                  <img src="/luana.jpg" alt="Luana" className="w-full h-full object-cover" />
                </div>
              </div>
              
              <div className="flex-1 relative w-full">
                {/* Setinha pro lado (Desktop) */}
                <div className="hidden md:block absolute top-10 -left-2.5 w-5 h-5 bg-[var(--color-wine)] rotate-45 border-l border-b border-[var(--color-gold)] opacity-50"></div>
                {/* Setinha pra cima (Mobile) */}
                <div className="block md:hidden absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-[var(--color-wine)] rotate-45 border-l border-t border-[var(--color-gold)] opacity-50"></div>
                
                <div className="bg-[var(--color-wine)] p-6 md:p-8 rounded-3xl border border-[var(--color-gold)] border-opacity-50 shadow-xl relative z-10 text-center md:text-left">
                  <p className="text-base md:text-lg font-serif text-[var(--color-gold-light)] leading-relaxed italic opacity-90 drop-shadow-sm mb-3">
                    "{latestQuote.quote}"
                  </p>
                  <div className="flex justify-center md:justify-end">
                    <Link href="/pilulas" className="text-[var(--color-gold-light)] opacity-50 hover:opacity-100 text-[10px] md:text-xs uppercase tracking-widest border-b border-transparent hover:border-[var(--color-gold-light)] transition-all">
                      + Mais pílulas
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2 Opções Principais (Call-to-Actions) */}
          <div className="flex flex-col sm:flex-row w-full gap-4 justify-center items-center max-w-lg mx-auto mb-10 px-4 sm:px-0">
            <Link href="/vitrine" className="w-full sm:w-auto bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] px-8 py-4 rounded-full font-bold uppercase tracking-widest hover:scale-105 hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all text-xs md:text-sm shadow-xl flex-1 flex items-center justify-center gap-2">
              <span>Meus Achados</span>
            </Link>
            <Link href="/blog" className="w-full sm:w-auto bg-[var(--color-wine)] border border-[var(--color-gold)] text-[var(--color-gold)] px-8 py-4 rounded-full font-bold uppercase tracking-widest hover:bg-[var(--color-wine-light)] hover:scale-105 transition-all text-xs md:text-sm shadow-xl flex-1 flex items-center justify-center gap-2">
              <span>Papo de Mulher</span>
            </Link>
          </div>

          {/* Opção Secundária (História) */}
          <div className="mt-4">
            <Link href="/sobre" className="text-[var(--color-gold-light)] opacity-70 hover:opacity-100 text-xs md:text-sm border-b border-[var(--color-wine-light)] hover:border-[var(--color-gold)] pb-1 transition-all uppercase tracking-[0.15em]">
              Nossa História
            </Link>
          </div>

        </div>

        {/* Vitrine Rápida Abaixo da Dobra */}
        <section id="vitrine" className="w-full max-w-5xl pt-16 md:pt-24 border-t border-[var(--color-wine-light)] mb-24">
          <h2 className="text-2xl md:text-3xl font-serif text-[var(--color-gold)] text-center mb-4 uppercase tracking-widest drop-shadow-md">Últimos Segredos</h2>
          <p className="text-center text-[var(--color-gold-light)] opacity-70 mb-10 md:mb-16 text-sm md:text-base">Acabaram de chegar na vitrine</p>
          
          {(!products || products.length === 0) ? (
            <p className="text-center text-[var(--color-gold-light)] opacity-70">A vitrine está sendo preparada pelas estrelas...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
              {products.map((produto: any) => (
                <ProductCard key={produto.id} produto={produto} />
              ))}
            </div>
          )}
          
          <div className="text-center mt-12 md:mt-16">
            <Link href="/vitrine" className="inline-block border border-[var(--color-gold)] text-[var(--color-gold)] px-10 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-[var(--color-wine-light)] hover:text-white transition-all text-xs md:text-sm shadow-md">
              Acessar Vitrine Completa
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
