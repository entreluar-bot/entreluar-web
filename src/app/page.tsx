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
        <div className="w-full min-h-[85vh] flex flex-col items-center justify-center py-12 md:py-16 text-center animate-fade-in mt-8">
          
          {/* Foto da Luana */}
          <div className="relative mb-6">
            <div className="w-32 h-32 md:w-44 md:h-44 rounded-full overflow-hidden border-2 border-[var(--color-gold)] shadow-[0_0_40px_rgba(212,175,55,0.2)]">
              <img src="/luana.jpg" alt="Luana" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[var(--color-wine-dark)] px-4 py-1.5 rounded-full border border-[var(--color-gold)] whitespace-nowrap shadow-md">
               <span className="text-[var(--color-gold-light)] text-[10px] md:text-[11px] uppercase tracking-[0.25em] font-bold">
                 Luana diz:
               </span>
            </div>
          </div>

          {/* Frase / Pílula (Menor e mais delicada) */}
          {latestQuote && (
            <div className="max-w-2xl mx-auto mb-10 mt-4 px-2">
              <h1 className="text-lg md:text-2xl font-serif text-[var(--color-gold)] leading-relaxed italic opacity-90 drop-shadow-md">
                "{latestQuote.quote}"
              </h1>
              <div className="mt-4">
                <Link href="/pilulas" className="text-[var(--color-gold-light)] opacity-50 hover:opacity-100 text-[10px] md:text-xs uppercase tracking-widest border-b border-transparent hover:border-[var(--color-gold-light)] transition-all">
                  Ler outras pílulas
                </Link>
              </div>
            </div>
          )}

          {/* 2 Opções Principais (Call-to-Actions) */}
          <div className="flex flex-col sm:flex-row w-full gap-4 justify-center items-center max-w-lg mx-auto mb-12 px-4 sm:px-0">
            <Link href="/vitrine" className="w-full sm:w-auto bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] px-8 py-4 rounded-full font-bold uppercase tracking-widest hover:scale-105 hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all text-sm shadow-xl flex-1 flex items-center justify-center gap-2">
              <span>Meus Achados</span>
            </Link>
            <Link href="/blog" className="w-full sm:w-auto bg-[var(--color-wine)] border border-[var(--color-gold)] text-[var(--color-gold)] px-8 py-4 rounded-full font-bold uppercase tracking-widest hover:bg-[var(--color-wine-light)] hover:scale-105 transition-all text-sm shadow-xl flex-1 flex items-center justify-center gap-2">
              <span>Papo de Mulher</span>
            </Link>
          </div>

          {/* Opção Secundária (História) */}
          <div className="mt-2">
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
