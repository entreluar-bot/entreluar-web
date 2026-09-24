import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { JournalPost } from "../../types";

export const revalidate = 0;

export default async function ReviewPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("journal").select("*").eq("id", id).single();
  if (!data) notFound();
  const post = data as JournalPost;

  return (
    <main className="site-shell">
      <article className="article-shell luxe-card">
        <div className="p-5 md:p-8">
          <Link href="/resenhas" className="eyebrow inline-flex">← Voltar para o Te Explico</Link>
        </div>
        {post.image_url && (
          <div className="relative aspect-[16/10]">
            <Image src={post.image_url} alt={post.title} fill priority sizes="(max-width:900px) 100vw,840px" className="object-cover" unoptimized />
          </div>
        )}
        <header className="p-6 md:p-12">
          <p className="eyebrow">Estudei para te explicar • {new Date(post.created_at).toLocaleDateString("pt-BR")}</p>
          <h1 className="section-title my-6">{post.title}</h1>
          <div className="prose-luxe" dangerouslySetInnerHTML={{ __html: post.content }} />
          <section className="next-steps" aria-label="Continue navegando">
            <Link href="/vitrine" className="ghost-button">Ver achados relacionados →</Link>
            <Link href="/blog" className="ghost-button">Conversar sobre vida real →</Link>
            <Link href="/pilulas" className="ghost-button">Quero uma dose curta →</Link>
          </section>
        </header>
      </article>
    </main>
  );
}
