import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { Product } from "../../types";

export const revalidate = 0;

export default async function ProductPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").eq("id", id).single();
  if (!data) notFound();
  const product = data as Product;

  return (
    <main className="site-shell">
      <article className="article-shell luxe-card">
        <div className="p-5 md:p-8">
          <Link href="/vitrine" className="eyebrow inline-flex items-center">← Voltar para a bancada</Link>
        </div>
        {product.image_url && (
          <div className="relative aspect-[4/3] w-full">
            <Image src={product.image_url} alt={product.title} fill priority sizes="(max-width:900px) 100vw,840px" className="object-cover" unoptimized />
          </div>
        )}
        <header className="p-6 md:p-12">
          <p className="eyebrow">{product.category || "Escolha da Luana"}</p>
          <h1 className="section-title my-4">{product.title}</h1>
          {product.price && <p className="font-display text-3xl text-[var(--champagne)]">{product.price}</p>}
          <div className="prose-luxe mt-8" dangerouslySetInnerHTML={{ __html: product.description }} />
          <div className="mt-10 border-t border-[var(--line)] pt-8">
            <a href={product.shopee_link} target="_blank" rel="noreferrer" className="luxe-button w-full">Quero ver onde achei ↗</a>
          </div>
          <section className="next-steps" aria-label="Continue navegando">
            <Link href="/resenhas" className="ghost-button">Entender ativos →</Link>
            <Link href="/blog" className="ghost-button">Entrar num papo →</Link>
            <Link href="/pilulas" className="ghost-button">Ler uma pílula →</Link>
          </section>
        </header>
      </article>
    </main>
  );
}
