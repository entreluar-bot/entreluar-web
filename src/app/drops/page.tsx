import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export const revalidate = 0;

export default async function Drops() {
  const supabase = await createClient();
  const { data: drops } = await supabase.from("drops").select("*").order("created_at", { ascending: false });

  // Helper to ensure instagram url is embeddable
  const getEmbedUrl = (url: string) => {
    try {
      const cleanUrl = url.split("?")[0].replace(/\/$/, "");
      return `${cleanUrl}/embed`;
    } catch {
      return url;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-wine-dark)] flex flex-col font-sans">
      <div className="absolute inset-0 bg-stars opacity-30 pointer-events-none"></div>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 relative z-10 pt-16">
        <div className="mb-8">
          <Link href="/" className="text-[var(--color-gold)] hover:text-white transition-colors text-sm uppercase tracking-widest">
            &larr; Voltar para a Home
          </Link>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-serif text-[var(--color-gold)] mb-4">Drops do Insta</h1>
          <p className="text-[var(--color-gold-light)] opacity-70 text-lg max-w-2xl mx-auto mb-8">
            Meus achados rápidos, reels e novidades direto do meu Instagram para você.
          </p>
        </div>

        {(!drops || drops.length === 0) ? (
          <p className="text-center text-[var(--color-gold-light)] opacity-70">Ainda não temos drops por aqui...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {drops.map((drop) => (
              <div key={drop.id} className="bg-[var(--color-wine)] p-4 rounded-xl border border-[var(--color-wine-light)] flex flex-col shadow-lg hover:border-[var(--color-gold)] transition-colors">
                <h3 className="text-xl font-serif text-[var(--color-gold)] mb-4 text-center line-clamp-2">{drop.title}</h3>
                
                <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[400px] bg-black bg-opacity-20 rounded-lg overflow-hidden">
                  <iframe 
                    src={getEmbedUrl(drop.instagram_url)} 
                    className="w-full h-[400px] md:h-[450px]" 
                    frameBorder="0" 
                    scrolling="no" 
                    allowTransparency={true} 
                    allow="encrypted-media"
                  />
                </div>
                
                <a href={drop.instagram_url} target="_blank" rel="noopener noreferrer" className="mt-6 border border-[var(--color-gold)] text-[var(--color-gold)] px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[var(--color-wine-light)] transition-colors text-center block w-full">
                  Abrir no Instagram
                </a>
              </div>
            ))}
          </div>
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
