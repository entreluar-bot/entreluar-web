import Link from "next/link";

export default function ProductCard({ produto }: { produto: any }) {
  // Remover HTML para mostrar um resumo limpo e evitar bugs de layout
  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>?/gm, '');
  };
  const excerpt = stripHtml(produto.description).slice(0, 150) + "...";

  return (
    <div className="bg-[var(--color-wine)] border border-[var(--color-wine-light)] rounded-t-full p-6 flex flex-col items-center hover:border-[var(--color-gold)] transition-colors group">
      
      <Link href={`/vitrine/${produto.id}`} className="flex flex-col items-center">
        {produto.image_url ? (
          <img src={produto.image_url} alt={produto.title} className="w-40 h-40 md:w-48 md:h-48 object-cover rounded-full mb-6 border-2 border-[var(--color-gold)] shadow-[0_0_15px_rgba(212,175,55,0.2)] group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-40 h-40 md:w-48 md:h-48 rounded-full mb-6 border-2 border-[var(--color-gold)] flex items-center justify-center text-[var(--color-gold)] text-4xl group-hover:scale-105 transition-transform">?</div>
        )}
        <h3 className="text-lg md:text-xl font-serif text-[var(--color-gold)] mb-2 text-center group-hover:text-white transition-colors">{produto.title}</h3>
      </Link>

      {produto.price && <p className="text-[var(--color-gold-light)] font-bold mb-4">{produto.price}</p>}
      
      <p className="text-xs md:text-sm text-[var(--color-gold-light)] text-center italic mb-6 leading-relaxed opacity-90">
        {excerpt}
      </p>
      
      <Link href={`/vitrine/${produto.id}`} className="text-[var(--color-gold)] text-xs uppercase tracking-widest hover:underline mb-6 font-bold">
        Ler Resenha Completa
      </Link>
      
      <a href={produto.shopee_link} target="_blank" rel="noopener noreferrer" className="mt-auto bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] px-6 py-3 rounded-full text-xs md:text-sm font-bold uppercase tracking-widest hover:scale-105 transition-transform w-full text-center shadow-[0_0_15px_rgba(212,175,55,0.3)]">
        Ver na Loja
      </a>
    </div>
  );
}
