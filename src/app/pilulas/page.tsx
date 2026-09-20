import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export const revalidate = 0;

export default async function Pilulas() {
  const supabase = await createClient();
  const { data: quotes } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[var(--color-wine-dark)] flex flex-col font-sans">
      <div className="absolute inset-0 bg-stars opacity-30 pointer-events-none"></div>

      <main className="flex-1 max-w-5xl w-full mx-auto p-8 relative z-10 pt-16">
        <div className="mb-12">
          <Link href="/" className="text-[var(--color-gold)] hover:text-white transition-colors">
            &larr; Voltar para a Home
          </Link>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-serif text-[var(--color-gold)] mb-4">Pílulas Diárias</h1>
          <p className="text-[var(--color-gold-light)] opacity-70 text-lg max-w-2xl mx-auto mb-8">
            Doses curtas de acolhimento, deboche e poder para a mulher madura. 
            Leia uma por dia (ou várias quando a menopausa bater forte).
          </p>
        </div>

        {(!quotes || quotes.length === 0) ? (
          <p className="text-center text-[var(--color-gold-light)] opacity-70">O pote de pílulas está vazio por enquanto...</p>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {quotes.map((q: any) => (
              <div key={q.id} className="break-inside-avoid bg-[var(--color-wine)] bg-opacity-80 p-8 rounded-xl shadow-xl border border-[var(--color-wine-light)] hover:border-[var(--color-gold)] hover:-translate-y-1 transition-all">
                <span className="text-[var(--color-gold)] text-4xl font-serif leading-none opacity-50 block mb-2">"</span>
                <p className="text-[var(--color-gold-light)] font-serif text-xl italic leading-relaxed mb-4">
                  {q.quote}
                </p>
                <div className="border-t border-[var(--color-wine-light)] pt-4 mt-4 flex justify-between items-center">
                  <span className="text-xs uppercase tracking-widest text-[var(--color-gold-light)] opacity-50">
                    {new Date(q.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">
                    Luana
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
