import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { absoluteUrl, plainTextFromHtml, siteUrl } from "@/lib/share-metadata";
import { getActivePollForJournal } from "@/lib/poll";
import NewsletterSignup from "../../ui/NewsletterSignup";
import ConversationCircle from "../../ui/ConversationCircle";
import ShareButton from "../../ui/ShareButton";
import PollWidget from "../../ui/PollWidget";
import type { JournalComment, JournalPost } from "../../types";

export const revalidate = 0;

type BlogPostProps = { params: Promise<{ id: string }> };

async function getPost(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("journal").select("*").eq("id", id).single();
  return data as JournalPost | null;
}

export async function generateMetadata({ params }: BlogPostProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return {};
  const url = `${siteUrl}/blog/${id}`;
  const description = plainTextFromHtml(post.content, 170) || "Papo de Mulher na Entreluar, com maturidade, autocuidado e conversa de amiga.";
  const image = absoluteUrl(post.image_url);

  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${id}` },
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

export default async function BlogPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, { data: commentRows }, poll] = await Promise.all([
    supabase.from("journal").select("*").eq("id", id).single(),
    supabase
      .from("journal_comments")
      .select("id,journal_id,body,status,created_at,approved_at")
      .eq("journal_id", id)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    getActivePollForJournal(supabase, id),
  ]);

  if (!data) notFound();
  const post = data as JournalPost;
  const comments = (commentRows || []) as JournalComment[];
  const shareUrl = `${siteUrl}/blog/${post.id}`;

  const PAPO_ONLY = 'category.is.null,category.neq."Estudei para te explicar"';
  const [{ data: nextRows }, { data: prevRows }] = await Promise.all([
    supabase.from("journal").select("id,title").or(PAPO_ONLY).lt("created_at", post.created_at).order("created_at", { ascending: false }).limit(1),
    supabase.from("journal").select("id,title").or(PAPO_ONLY).gt("created_at", post.created_at).order("created_at", { ascending: true }).limit(1),
  ]);
  const nextPost = (nextRows || [])[0] as Pick<JournalPost, "id" | "title"> | undefined;
  const prevPost = (prevRows || [])[0] as Pick<JournalPost, "id" | "title"> | undefined;

  return (
    <main className="site-shell">
      <article className="article-shell luxe-card">
        <div className="p-5 md:p-8">
          <Link href="/blog" className="eyebrow inline-flex">← Voltar para as conversas</Link>
        </div>
        {post.image_url && (
          <div className="relative aspect-[16/10]">
            <Image src={post.image_url} alt={post.title} fill priority sizes="(max-width:900px) 100vw,840px" className="object-cover" unoptimized />
          </div>
        )}
        <header className="p-6 md:p-12">
          <p className="eyebrow">{post.category || "Papo de Mulher"} • {new Date(post.created_at).toLocaleDateString("pt-BR")}</p>
          <h1 className="section-title my-6">{post.title}</h1>
          <ShareButton title={post.title} url={shareUrl} shareText={`Li isso e achei tudo a ver com a gente: ${post.title}`} className="mb-8" />
          <div className="prose-luxe" dangerouslySetInnerHTML={{ __html: post.content }} />

          {poll && <PollWidget poll={poll.poll} options={poll.options} counts={poll.counts} />}

          <ConversationCircle postId={post.id} postTitle={post.title} comments={comments} />

          <section className="newsletter-cta newsletter-cta--article" aria-labelledby="post-newsletter-title">
            <div>
              <p className="eyebrow">Entreluar por email</p>
              <h2 id="post-newsletter-title" className="font-display text-4xl leading-none text-[var(--champagne-pale)]">A próxima conversa pode chegar primeiro para você.</h2>
              <p className="muted mt-3 leading-7">Novidades 50+, autocuidado sem manual, convites especiais e papo de mulher para ler com calma.</p>
            </div>
            <NewsletterSignup source="blog-post" />
          </section>

          {(prevPost || nextPost) && (
            <section className="section-space grid gap-4 sm:grid-cols-2" aria-label="Continue passeando pelos papos">
              {prevPost && (
                <Link href={`/blog/${prevPost.id}`} className="luxe-card p-6">
                  <p className="eyebrow">← Papo anterior</p>
                  <p className="font-display mt-2 text-xl leading-tight text-[var(--champagne-pale)]">{prevPost.title}</p>
                </Link>
              )}
              {nextPost && (
                <Link href={`/blog/${nextPost.id}`} className={`luxe-card p-6 sm:text-right${!prevPost ? " sm:col-start-2" : ""}`}>
                  <p className="eyebrow">Próximo papo →</p>
                  <p className="font-display mt-2 text-xl leading-tight text-[var(--champagne-pale)]">{nextPost.title}</p>
                </Link>
              )}
            </section>
          )}

          <section className="next-steps" aria-label="Continue navegando">
            <Link href="/pilulas" className="ghost-button">Quero uma pílula →</Link>
            <Link href="/resenhas" className="ghost-button">Ver o que estudei para te explicar →</Link>
            <Link href="/vitrine" className="ghost-button">Ver achados honestos →</Link>
          </section>
        </header>
      </article>
    </main>
  );
}
