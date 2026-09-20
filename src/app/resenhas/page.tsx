import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export const revalidate = 0;

export default async function Resenhas() {
  const supabase = await createClient();
  const { data: journal } = await supabase
    .from("journal")
    .select("*")
    .eq("category", "Estudei para te explicar")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[var(--color-wine-dark)] flex flex-col font-sans">
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 relative z-10 pt-16">
        <div className="mb-12">
          <Link href="/" className="text-[var(--color-gold)] hover:text-white transition-colors text-sm uppercase tracking-widest">
            &larr; Voltar para a Home
          </Link>
        </div>

        <div className="text-center mb-16 relative">
          {/* Decorative Sparkles */}
          <div className="absolute -top-10 left-1/4 w-32 h-32 bg-[var(--color-gold)] rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
          <div className="absolute top-10 right-1/4 w-32 h-32 bg-[#ffc0cb] rounded-full blur-[100px] opacity-10 pointer-events-none"></div>
          
          <h1 className="text-4xl md:text-6xl font-serif text-[var(--color-gold)] mb-4 flex items-center justify-center gap-4">
            ✨ Estudei para te explicar ✨
          </h1>
          <p className="text-[var(--color-gold-light)] opacity-70 text-lg max-w-2xl mx-auto mb-8">
            Análises profundas e sinceras sobre os produtos da nossa vitrine. Eu testo, pesquiso a ciência por trás e te conto toda a verdade, como uma amiga faria.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {journal?.map((post) => (
            <article key={post.id} className="bg-[var(--color-wine)] rounded-xl overflow-hidden border border-[var(--color-gold)] shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full">
              {post.image_url && (
                <div className="h-48 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-wine)] to-transparent z-10"></div>
                  <img src={post.image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}
              <div className="p-6 flex flex-col flex-1 relative z-20 -mt-6">
                <span className="text-[10px] uppercase tracking-widest text-[var(--color-gold)] mb-2 block font-bold">
                  {new Date(post.created_at).toLocaleDateString("pt-BR")}
                </span>
                <h3 className="text-xl font-serif text-white mb-3 line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-[var(--color-gold-light)] opacity-80 text-sm line-clamp-3 flex-1 mb-6">
                  {post.content.replace(/<[^>]+>/g, "")}
                </p>
                <Link href={`/resenhas/${post.id}`} className="inline-block bg-[var(--color-gold)] text-[var(--color-wine-dark)] px-6 py-2 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-white transition-colors text-center mt-auto shadow-[0_0_10px_rgba(212,175,55,0.5)]">
                  Ler Resenha Completa
                </Link>
              </div>
            </article>
          ))}
        </div>

        {(!journal || journal.length === 0) && (
          <p className="text-center text-[var(--color-gold-light)] opacity-70 mt-10">Nenhuma resenha encontrada no momento.</p>
        )}

        <div className="mt-16 text-center pb-12">
          <Link href="/" className="text-[var(--color-gold)] hover:text-white transition-colors text-xs md:text-sm uppercase tracking-widest font-bold">
            &larr; Voltar para a Home
          </Link>
        </div>
      </main>
    </div>
  );
}
