import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { absoluteUrl, plainTextFromHtml, siteUrl } from "@/lib/share-metadata";
import ShareButton from "../../ui/ShareButton";
import type { JournalPost } from "../../types";

export const revalidate = 0;

type ReviewPostProps = { params: Promise<{ id: string }> };

async function getReviewPost(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("journal").select("*").eq("id", id).single();
  return data as JournalPost | null;
}

export async function generateMetadata({ params }: ReviewPostProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getReviewPost(id);
  if (!post) return {};
  const url = `${siteUrl}/resenhas/${id}`;
  const description = plainTextFromHtml(post.content, 170) || "Estudei para te explicar sem complicar: ativos, promessas e verdades para a vida real.";
  const image = absoluteUrl(post.image_url);

  return {
    title: post.title,
    description,
    alternates: { canonical: `/resenhas/${id}` },
    openGraph: {
      title: post.title,
      description,
      url,
      type: "article",
      images: [{ url: image, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [image],
    },
  };
}

export default async function ReviewPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("journal").select("*").eq("id", id).single();
  if (!data) notFound();
  const post = data as JournalPost;
  const shareUrl = `${siteUrl}/resenhas/${post.id}`;

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
          <ShareButton title={post.title} url={shareUrl} shareText={`Finalmente uma explicação que dá para entender: ${post.title}`} className="mb-8" />
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
