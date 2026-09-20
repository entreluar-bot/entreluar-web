import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 0;

export default async function BlogPost({ params }: { params: any }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase.from("journal").select("*").eq("id", id).single();

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--color-wine-dark)] flex flex-col font-sans">
      <main className="flex-1 max-w-3xl w-full mx-auto p-8 relative z-10 pt-16">
        <div className="mb-12">
          <Link href="/blog" className="text-[var(--color-gold)] hover:text-white transition-colors">
            &larr; Voltar para o Diário
          </Link>
        </div>

        <article className="bg-[var(--color-wine)] rounded-xl overflow-hidden border border-[var(--color-wine-light)] shadow-2xl">
          {post.image_url && (
            <div className="w-full h-64 md:h-96 relative">
              <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-wine)] to-transparent"></div>
            </div>
          )}

          <div className="p-8 md:p-12">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-xs uppercase tracking-widest text-[var(--color-gold-light)] opacity-70 border border-[var(--color-wine-light)] px-3 py-1 rounded-full">
                {post.category || "Geral"}
              </span>
              <span className="text-xs uppercase tracking-widest text-[var(--color-gold-light)] opacity-50">
                {new Date(post.created_at).toLocaleDateString("pt-BR")}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-serif text-[var(--color-gold)] mb-8 leading-tight">
              {post.title}
            </h1>

            <div className="prose prose-invert prose-gold max-w-none text-[var(--color-gold-light)] leading-relaxed text-lg" dangerouslySetInnerHTML={{ __html: post.content }} />
          </div>
        </article>
      </main>
    </div>
  );
}
