import Image from "next/image";
import Link from "next/link";
import type { Product } from "./types";

export default function ProductCard({ produto }: { produto: Product }) {
  const excerpt = produto.description.replace(/<[^>]*>?/gm, "").slice(0, 118);
  const isStyle = produto.category === "Acessórios" || produto.category === "Roupas";
  const highlights = [
    produto.is_featured && "Destaque",
    produto.is_most_purchased && "Mais comprado",
    produto.is_most_viewed && "Mais visto",
  ].filter(Boolean) as string[];

  return (
    <article className="luxe-card group flex h-full flex-col">
      <Link href={`/vitrine/${produto.id}`} className="relative block aspect-[4/3] min-h-0 overflow-hidden">
        {produto.image_url ? <Image src={produto.image_url} alt={produto.title} fill sizes="(max-width:760px) 100vw,33vw" className="object-cover transition duration-700 group-hover:scale-105" unoptimized /> : <div className="grid h-full place-items-center bg-[#240910] text-5xl text-[var(--champagne)]">✨</div>}
        <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-[10px] font-bold uppercase tracking-[.18em] backdrop-blur">{produto.category || "Escolha da Luana"}</span>
        {highlights.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-1.5">
            {highlights.map((highlight) => <span key={highlight} className="rounded-full border border-[var(--champagne)]/40 bg-[var(--wine-950)]/85 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-[var(--champagne-pale)] backdrop-blur">{highlight}</span>)}
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-3xl leading-none text-[var(--champagne-pale)]">{produto.title}</h3>
        {produto.price && <p className="mt-3 font-bold text-[var(--champagne)]">{produto.price}</p>}
        <p className="muted my-4 flex-1 text-sm leading-7">{excerpt}{produto.description.length > 118 ? "…" : ""}</p>
        <div className="flex gap-2"><Link href={`/vitrine/${produto.id}`} className="ghost-button flex-1">{isStyle ? "Ver os detalhes" : "Minha opinião"}</Link><a href={produto.shopee_link} target="_blank" rel="noreferrer" className="luxe-button flex-1">Ver onde achei ↗</a></div>
      </div>
    </article>
  );
}
