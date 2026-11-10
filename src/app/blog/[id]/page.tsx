import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { absoluteUrl, plainTextFromHtml, siteUrl } from "@/lib/share-metadata";
import { getActivePollForJournal } from "@/lib/poll";
import { getReactionsForJournal } from "@/lib/reactions";
import ConversationCircle from "../../ui/ConversationCircle";
import ShareButton from "../../ui/ShareButton";
import TopQuickActions from "../../ui/TopQuickActions";
import PollWidget from "../../ui/PollWidget";
import ReactionBar from "../../ui/ReactionBar";
import { getApprovedComments } from "@/lib/comments";
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
  const [{ data }, commentRows, poll, reactions] = await Promise.all([
    supabase.from("journal").select("*").eq("id", id).single(),
    getApprovedComments(supabase, "journal_id", id),
    getActivePollForJournal(supabase, id),
    getReactionsForJournal(supabase, id),
  ]);

  if (!data) notFound();
  const post = data as JournalPost;
  const comments = (commentRows || []) as JournalComment[];
  const shareUrl = `${siteUrl}/blog/${post.id}`;

  const [{ data: nextRows }, { data: prevRows }] = await Promise.all([
    supabase.from("journal").select("id,title").eq("editorial_pillar", "papo").lt("created_at", post.created_at).order("created_at", { ascending: false }).limit(1),
    supabase.from("journal").select("id,title").eq("editorial_pillar", "papo").gt("created_at", post.created_at).order("created_at", { ascending: true }).limit(1),
  ]);
  const nextPost = ((nextRows || [])[0] || (prevRows || [])[0]) as Pick<JournalPost, "id" | "title"> | undefined;

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
          <TopQuickActions title={post.title} shareUrl={shareUrl} shareText={`Li isso e achei tudo a ver com a gente: ${post.title}`} />
          {comments.length > 0 && (
            <a href="#conversation-circle-title" className="conversation-jumplink">💬 {comments.length} comentário{comments.length === 1 ? "" : "s"} — ver e participar →</a>
          )}
          <div className="prose-luxe" dangerouslySetInnerHTML={{ __html: post.content }} />
          <ReactionBar journalId={post.id} initialCounts={reactions} />
          <ShareButton title={post.title} url={shareUrl} shareText={`Li isso e achei tudo a ver com a gente: ${post.title}`} className="article-share-compact" />

          {poll && <PollWidget poll={poll.poll} options={poll.options} counts={poll.counts} />}

          <ConversationCircle postId={post.id} postTitle={post.title} postCreatedAt={post.created_at} comments={comments} question={post.reader_question} contentType="journal" variant="journal" />

          {nextPost && <section className="next-reading" aria-label="A próxima conversa"><p className="eyebrow">A próxima conversa</p><Link href={`/blog/${nextPost.id}`} className="luxe-card mt-3 block p-6"><p className="font-display text-2xl leading-tight text-[var(--champagne-pale)]">{nextPost.title}</p><span className="mt-4 inline-flex text-xs font-bold uppercase tracking-[.14em] text-[var(--champagne)]">Continuar na roda →</span></Link></section>}
        </header>
      </article>
    </main>
  );
}
