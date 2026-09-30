import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { absoluteUrl, plainTextFromHtml, siteUrl } from "@/lib/share-metadata";
import type { ContentSummary } from "@/lib/summary";
import { buildRoutineSentence, type Tag } from "@/lib/tags";
import ShareButton from "../../ui/ShareButton";
import QuickSummaryCard from "../../ui/QuickSummaryCard";
import AddToRoutineButton from "../../ui/AddToRoutineButton";
import ConversationCircle from "../../ui/ConversationCircle";
import type { JournalComment, Product } from "../../types";

export const revalidate = 0;

type ProductPostProps = { params: Promise<{ id: string }> };

async function getProduct(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").eq("id", id).single();
  return data as Product | null;
}

export async function generateMetadata({ params }: ProductPostProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return {};
  const url = `${siteUrl}/vitrine/${id}`;
  const description = plainTextFromHtml(product.description, 170) || "Achado honesto da Vitrine Entreluar, com opinião simples e conversa de amiga.";
  const image = absoluteUrl(product.image_url);

  return {
    title: product.title,
    description,
    alternates: { canonical: `/vitrine/${id}` },
    openGraph: {
      title: product.title,
      description,
      url,
      type: "article",
      images: [{ url: image, alt: product.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description,
      images: [image],
    },
  };
}

export default async function ProductPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, { data: summaryData }, { data: commentRows }, { data: tagRows }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase.from("content_summaries").select("*").eq("content_type", "product").eq("content_id", id).maybeSingle(),
    supabase
      .from("journal_comments")
      .select("id,product_id,reader_name,hide_reader_name,body,status,created_at,approved_at")
      .eq("product_id", id)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase.from("content_tags").select("tags(id,name,slug,type)").eq("content_type", "product").eq("content_id", id),
  ]);
  if (!data) notFound();
  const product = data as Product;
  const summary = summaryData as ContentSummary | null;
  const comments = (commentRows || []) as JournalComment[];
  const productTags = (tagRows || []).flatMap((row: { tags: Tag | Tag[] | null }) => (Array.isArray(row.tags) ? row.tags : row.tags ? [row.tags] : []));
  const routineSentence = buildRoutineSentence(productTags);
  const shareUrl = `${siteUrl}/vitrine/${product.id}`;

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
          {comments.length > 0 && (
            <a href="#conversation-circle-title" className="conversation-jumplink">💬 {comments.length} comentário{comments.length === 1 ? "" : "s"} — ver e participar →</a>
          )}
          {product.price && <p className="font-display text-3xl text-[var(--champagne)]">{product.price}</p>}
          <QuickSummaryCard summary={summary} />
          {routineSentence && (
            <div className="routine-card">
              <p>Ficha rápida</p>
              <p>{routineSentence}</p>
            </div>
          )}
          <div className="prose-luxe mt-8" dangerouslySetInnerHTML={{ __html: product.description }} />
          <div className="mt-10 border-t border-[var(--line)] pt-8">
            <a href={product.shopee_link} target="_blank" rel="noreferrer" className="luxe-button w-full">Quer o seu? Clica aqui ↗</a>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ShareButton title={product.title} url={shareUrl} shareText={`Achei isso aqui e lembrei de você: ${product.title}`} />
            <AddToRoutineButton id={product.id} title={product.title} image_url={product.image_url} className="sm:mt-0" />
          </div>
          <ConversationCircle postId={product.id} postTitle={product.title} comments={comments} contentType="product" variant="product" />
          <section className="next-steps" aria-label="Continue navegando">
            <Link href={product.companion_journal_id ? `/resenhas/${product.companion_journal_id}` : "/resenhas"} className="ghost-button">Entender ativos →</Link>
            <Link href="/blog" className="ghost-button">Entrar num papo →</Link>
            <Link href="/pilulas" className="ghost-button">Ler uma pílula →</Link>
          </section>
        </header>
      </article>
    </main>
  );
}
