import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { absoluteUrl, plainTextFromHtml, siteUrl } from "@/lib/share-metadata";
import type { ContentSummary } from "@/lib/summary";
import { getActivePollForJournal } from "@/lib/poll";
import { getReactionsForJournal } from "@/lib/reactions";
import ShareButton from "../../ui/ShareButton";
import TopQuickActions from "../../ui/TopQuickActions";
import QuickSummaryCard from "../../ui/QuickSummaryCard";
import PollWidget from "../../ui/PollWidget";
import ConversationCircle from "../../ui/ConversationCircle";
import ReactionBar from "../../ui/ReactionBar";
import { getApprovedComments } from "@/lib/comments";
import type { JournalComment, JournalPost } from "../../types";

export const revalidate = 0;

type ReviewPostProps = { params: Promise<{ id: string }> };
type JournalSource = { id: string; title: string; url: string; source_type?: string | null; accessed_at?: string | null };

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
  const [{ data }, { data: summaryData }, poll, commentRows, reactions, { data: companionProduct }, { data: sourceRows }] = await Promise.all([
    supabase.from("journal").select("*").eq("id", id).single(),
    supabase.from("content_summaries").select("*").eq("content_type", "journal").eq("content_id", id).maybeSingle(),
    getActivePollForJournal(supabase, id),
    getApprovedComments(supabase, "journal_id", id),
    getReactionsForJournal(supabase, id),
    supabase.from("products").select("shopee_link").eq("companion_journal_id", id).maybeSingle(),
    supabase.from("journal_sources").select("id,title,url,source_type,accessed_at").eq("journal_id", id).order("created_at", { ascending: true }),
  ]);
  if (!data) notFound();
  const post = data as JournalPost;
  const summary = summaryData as ContentSummary | null;
  const comments = (commentRows || []) as JournalComment[];
  const sources = (sourceRows || []) as JournalSource[];
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
          <TopQuickActions title={post.title} shareUrl={shareUrl} shareText={`Finalmente uma explicação que dá para entender: ${post.title}`} />
          {comments.length > 0 && (
            <a href="#conversation-circle-title" className="conversation-jumplink">💬 {comments.length} comentário{comments.length === 1 ? "" : "s"} — ver e participar →</a>
          )}
          <QuickSummaryCard summary={summary} />
          <div className="prose-luxe" dangerouslySetInnerHTML={{ __html: post.content }} />
          {sources.length > 0 && <section className="article-sources" aria-labelledby="article-sources-title"><p className="eyebrow">Fontes revisadas</p><h2 id="article-sources-title">O que eu consultei para te explicar</h2><ul>{sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>{source.source_type ? ` · ${source.source_type}` : ""}</li>)}</ul><p className="muted text-sm">Revisado em {post.last_reviewed_at ? new Date(post.last_reviewed_at).toLocaleDateString("pt-BR") : new Date(post.created_at).toLocaleDateString("pt-BR")}.</p></section>}
          <ReactionBar journalId={post.id} initialCounts={reactions} />
          <ShareButton title={post.title} url={shareUrl} shareText={`Finalmente uma explicação que dá para entender: ${post.title}`} className="border-t border-[var(--line)] pt-8" />
          {poll && <PollWidget poll={poll.poll} options={poll.options} counts={poll.counts} />}
          <ConversationCircle postId={post.id} postTitle={post.title} postCreatedAt={post.created_at} comments={comments} question={post.reader_question} contentType="journal" variant="journal-estudei" />
          {companionProduct?.shopee_link && (
            <aside className="contextual-find" aria-label="Achado desta explicação">
              <p className="eyebrow">O achado desta explicação</p>
              <h2>Quer ver o que eu encontrei?</h2>
              <p>O produto relacionado está separado nos Meus Achados, com opinião, contexto e link só para quem decidir que faz sentido.</p>
              <Link href="/vitrine" className="ghost-button">Ver meu veredito →</Link>
            </aside>
          )}
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
