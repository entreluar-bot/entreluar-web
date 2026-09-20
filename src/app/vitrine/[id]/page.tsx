import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 0;

export default async function ProductPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: produto } = await supabase.from("products").select("*").eq("id", id).single();

  if (!produto) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--color-wine-dark)] flex flex-col font-sans">
      <div className="absolute inset-0 bg-stars opacity-30 pointer-events-none"></div>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 relative z-10 pt-16">
        <div className="mb-8 flex justify-between items-center">
          <Link href="/vitrine" className="text-[var(--color-gold)] hover:text-white transition-colors text-xs md:text-sm uppercase tracking-widest font-bold">
            &larr; Voltar para Vitrine
          </Link>
          <span className="text-[var(--color-gold-light)] opacity-50 uppercase tracking-widest text-xs border border-[var(--color-gold)] px-3 py-1 rounded-full">
            {produto.category || "Segredo"}
          </span>
        </div>

        <article className="bg-[var(--color-wine)] bg-opacity-90 p-6 md:p-12 rounded-2xl shadow-2xl border border-[var(--color-wine-light)]">
          <header className="text-center mb-10">
            {produto.image_url && (
              <div className="w-40 h-40 md:w-56 md:h-56 mx-auto rounded-full overflow-hidden border-4 border-[var(--color-gold)] shadow-[0_0_30px_rgba(212,175,55,0.3)] mb-8">
                <img src={produto.image_url} alt={produto.title} className="w-full h-full object-cover" />
              </div>
            )}
            <h1 className="text-3xl md:text-5xl font-serif text-[var(--color-gold)] mb-4 leading-tight">{produto.title}</h1>
            {produto.price && (
              <p className="text-xl md:text-2xl text-[var(--color-gold-light)] font-bold italic mb-6">{produto.price}</p>
            )}
          </header>

          <div 
            className="prose prose-invert prose-lg max-w-none text-[var(--color-gold-light)] opacity-90 prose-headings:text-[var(--color-gold)] prose-headings:font-serif prose-a:text-[var(--color-gold)] hover:prose-a:text-white prose-strong:text-[var(--color-gold)] leading-relaxed mb-12"
            dangerouslySetInnerHTML={{ __html: produto.description.replace(/href="\/blog"/g, 'href="/resenhas"') }}
          />

          <div className="flex justify-center border-t border-[var(--color-wine-light)] pt-12">
            <a href={produto.shopee_link} target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] px-10 py-4 rounded-full text-sm md:text-base font-bold uppercase tracking-widest hover:scale-105 transition-transform shadow-[0_0_20px_rgba(212,175,55,0.4)] text-center w-full md:w-auto">
              Quero Experimentar Esse Produto ✨
            </a>
          </div>
        </article>

        <div className="mt-12 text-center pb-12">
          <Link href="/vitrine" className="text-[var(--color-gold)] hover:text-white transition-colors text-xs md:text-sm uppercase tracking-widest font-bold">
            &larr; Voltar para Vitrine
          </Link>
        </div>
      </main>
    </div>
  );
}
