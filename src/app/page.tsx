import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import ProductCard from "./ProductCard";
import QuoteShareButton from "./ui/QuoteShareButton";
import EntreluarMaps from "./ui/EntreluarMaps";
import { THEME_GROUPS } from "@/lib/theme-groups";
import type { JournalPost, Product, Quote } from "./types";

export const revalidate = 0;

function getDailyQuote(quotes: Quote[]) {
  if (!quotes.length) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value || 0);
  const dayNumber = Math.floor(Date.UTC(value("year"), value("month") - 1, value("day")) / 86_400_000);
  return quotes[dayNumber % quotes.length];
}

function HomePortal({
  href,
  title,
  subtitle,
  isNew,
  primary = false,
  imageUrl,
}: {
  href: string;
  title: string;
  subtitle: string;
  isNew: boolean;
  primary?: boolean;
  imageUrl?: string | null;
}) {
  return (
    <Link
      href={href}
      className={`home-portal${primary ? " home-portal--primary" : ""}${imageUrl ? " home-portal--image" : ""}`}
      aria-label={`${title}: ${subtitle}${isNew ? ". Há conteúdo novo" : ""}`}
    >
      {imageUrl && <Image src={imageUrl} alt="" fill sizes="(max-width: 760px) 100vw, 520px" className="home-portal__image" unoptimized />}
      <span className="home-portal__shade" aria-hidden="true" />
      <span className="home-portal__copy"><strong>{title}</strong><span>{subtitle}</span></span>
      {isNew && <span className="home-portal__new"><span aria-hidden="true">✦</span> NOVO</span>}
      <span className="home-portal__arrow" aria-hidden="true">→</span>
    </Link>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const [
    { data: productRows },
    { data: quoteRows },
    { data: journalRows },
    { data: newProductRows },
    { data: newPapoRows },
    { data: newReviewRows },
    { data: conversationRows },
  ] = await Promise.all([
    supabase.from("products").select("*").order("created_at", { ascending: false }).limit(3),
    supabase.from("quotes").select("*").order("created_at", { ascending: true }),
    supabase.from("journal").select("*").eq("editorial_pillar", "papo").order("created_at", { ascending: false }).limit(3),
    supabase.from("products").select("id,title,image_url,is_new,created_at").eq("is_new", true).order("created_at", { ascending: false }).limit(1),
    supabase.from("journal").select("id,title,image_url,is_new,created_at").eq("is_new", true).eq("editorial_pillar", "papo").order("created_at", { ascending: false }).limit(1),
    supabase.from("journal").select("id,title,image_url,is_new,created_at").eq("is_new", true).eq("category", "Estudei para te explicar").order("created_at", { ascending: false }).limit(1),
    supabase.from("journal_comments").select("id,journal_id,reader_name,hide_reader_name,body,created_at,journal:journal_id(title,category)").eq("status", "approved").not("journal_id", "is", null).order("created_at", { ascending: false }).limit(3),
  ]);

  const products = (productRows || []) as Product[];
  const quotes = (quoteRows || []) as Quote[];
  const posts = (journalRows || []) as JournalPost[];
  const newProduct = ((newProductRows || []) as Product[])[0] || null;
  const newPapo = ((newPapoRows || []) as JournalPost[])[0] || null;
  const newReview = ((newReviewRows || []) as JournalPost[])[0] || null;
  const conversations = (conversationRows || []) as Array<{ id: string; journal_id?: string | null; reader_name?: string | null; hide_reader_name?: boolean; body: string; journal?: { title?: string | null; category?: string | null } | { title?: string | null; category?: string | null }[] | null }>;
  const featuredConversation = posts[0] || null;
  const quote = getDailyQuote(quotes);
  const dailyQuoteText = quote?.quote || "A maturidade não apaga o nosso brilho — ela finalmente ensina onde acender a luz.";
  const portalImage = newProduct?.image_url || products[0]?.image_url;

  return (
    <main className="site-shell home-shell">
      <div className="content-wrap">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Maturidade, corpo e vida sem manual</p>
            <h1 className="display-title">Madura.<br /><em>Luminosa.</em><br />Sem pedir licença.</h1>
            <p className="hero-intro">Eu puxo a cadeira para falar de menopausa, corpo, recomeços, desejos, família e liberdade. Estudo o que importa, troco ideias de verdade e só depois conto o que merece lugar na bancada.</p>
            <nav className="home-portals" aria-label="Escolha por onde começar">
              <HomePortal href={newPapo ? `/blog/${newPapo.id}` : "/blog"} title="Papo de Mulher" subtitle="A nossa roda sem manual" isNew={Boolean(newPapo)} primary imageUrl={newPapo?.image_url || null} />
              <HomePortal href={newReview ? `/resenhas/${newReview.id}` : "/resenhas"} title="Te Explico" subtitle="Ciência sem complicar" isNew={Boolean(newReview)} />
              <HomePortal href={newProduct ? `/vitrine/${newProduct.id}` : "/vitrine"} title="Meus Achados" subtitle="O que ficou na bancada" isNew={Boolean(newProduct)} imageUrl={portalImage} />
            </nav>
          </div>
          <div className="hero-portrait">
            <Image src="/luana.jpg" alt="Luana, fundadora da Entreluar" fill priority sizes="(max-width:760px) 100vw,55vw" />
            <div className="hero-seal">Entre beleza<br />e vivência<br />existe você</div>
          </div>
        </section>

        <section className="quote-ribbon glass-panel" aria-label="Pílula de hoje">
          <p className="eyebrow mb-3">Pílula de hoje ☾</p>
          <blockquote>“{dailyQuoteText}”</blockquote>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/pilulas" className="inline-flex min-h-11 items-center text-xs font-bold uppercase tracking-[.18em] text-[var(--champagne)]">Quero outra dose →</Link>
            <QuoteShareButton quote={dailyQuoteText} className="home-quote-share" />
          </div>
        </section>

        {featuredConversation && (
          <section className="section-space" aria-labelledby="conversation-of-week">
            <div className="section-kicker"><span className="eyebrow">A conversa da semana</span></div>
            <article className="featured-card luxe-card overflow-hidden">
              {featuredConversation.image_url && <div className="featured-card__media relative"><Image src={featuredConversation.image_url} alt="" fill sizes="(max-width:760px) 100vw,50vw" className="object-cover" unoptimized /></div>}
              <div className="featured-card__body">
                <p className="eyebrow">Papo de Mulher</p>
                <h2 id="conversation-of-week" className="section-title mt-3">{featuredConversation.title}</h2>
                <p className="muted mt-4 leading-7">{featuredConversation.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220)}…</p>
                <Link href={`/blog/${featuredConversation.id}`} className="luxe-button mt-6 self-start">Entrar na roda →</Link>
              </div>
            </article>
          </section>
        )}

        {conversations.length > 0 && (
          <section className="section-space" aria-labelledby="voices-of-circle">
            <div className="section-kicker"><span className="eyebrow">Vozes da roda</span></div>
            <h2 id="voices-of-circle" className="section-title mb-8">O que estamos<br /><em>conversando por aqui</em></h2>
            <div className="editorial-grid">
              {conversations.map((comment) => {
                const journal = Array.isArray(comment.journal) ? comment.journal[0] : comment.journal;
                const name = comment.hide_reader_name ? "Anônima" : comment.reader_name?.trim().split(/\s+/)[0] || "Uma leitora";
                return <article key={comment.id} className="luxe-card p-6"><p className="eyebrow">{journal?.category || "Papo de Mulher"}</p><p className="mt-4 font-display text-2xl leading-tight text-[var(--champagne-pale)]">“{comment.body.slice(0, 180)}{comment.body.length > 180 ? "…" : ""}”</p><p className="mt-5 text-sm text-[var(--muted)]">— {name}</p>{comment.journal_id && <Link href={(journal?.category === "Estudei para te explicar" ? "/resenhas/" : "/blog/") + comment.journal_id} className="mt-5 inline-flex text-xs font-bold uppercase tracking-[.14em] text-[var(--champagne)]">Continuar a conversa →</Link>}</article>;
              })}
            </div>
          </section>
        )}

        <section className="section-space" aria-labelledby="maps-title">
          <div className="section-kicker"><span className="eyebrow">Do seu jeito</span></div>
          <h2 id="maps-title" className="section-title mb-4">Dois mapas para<br /><em>começar por você.</em></h2>
          <p className="muted max-w-2xl leading-7">Sem cadastro obrigatório e sem fórmula pronta. Você responde por aqui, recebe uma direção editorial na hora e decide se quer levar uma Carta Entreluar para o email.</p>
          <EntreluarMaps />
        </section>

        <section className="section-space">
          <div className="section-kicker"><span className="eyebrow">Temas da comunidade</span></div>
          <h2 className="section-title mb-8">O que está vivo<br /><em>em você hoje?</em></h2>
          <div className="intent-grid">
            {THEME_GROUPS.map((group) => (
              <Link key={group.slug} href={`/temas/${group.slug}`} className="intent-tile">
                <span><span aria-hidden="true">{group.icon}</span> {group.label}</span>
                <strong>{group.subtitle}</strong>
              </Link>
            ))}
          </div>
        </section>

        <section className="section-space grid gap-8 md:grid-cols-[.8fr_1.2fr] md:items-center">
          <div className="relative min-h-[420px] overflow-hidden rounded-[32px_32px_120px_32px] border border-[var(--line)]"><Image src="/luana.jpg" alt="Luana em seu espaço" fill sizes="(max-width:760px) 100vw,40vw" className="object-cover object-[center_35%]" /></div>
          <div><p className="eyebrow">Quem eu sou e por que criei esse espaço</p><h2 className="section-title mt-4">A vida continua.<br /><em>E a conversa também.</em></h2><div className="muted my-6 max-w-xl space-y-4 text-base leading-8"><p>Eu sou a Luana. Tenho 54 anos, sou divorciada, mãe de uma filha de 18 e uma mulher que trabalha, se cuida, namora, erra a mão às vezes e segue aprendendo a viver uma fase que ninguém ensinou direito pra gente.</p><p>Eu senti falta de um lugar onde fosse possível falar de corpo, desejo, filhos, separação, liberdade, beleza, medo e recomeços sem constrangimento.</p><p>A Entreluar nasceu dessa falta.</p></div><Link href="/sobre" className="luxe-button">Conhecer minha história →</Link></div>
        </section>

        <section className="section-space">
          <div className="section-kicker"><span className="eyebrow">Mais leituras da roda</span></div>
          <h2 className="section-title mb-8">Entre nós,<br /><em>sem filtro</em></h2>
          {posts.length ? <div className="editorial-grid">{posts.map((post) => <Link key={post.id} href={post.category === "Estudei para te explicar" ? `/resenhas/${post.id}` : `/blog/${post.id}`} className="luxe-card group block"><div className="relative aspect-[4/3]">{post.image_url ? <Image src={post.image_url} alt="" fill sizes="(max-width:760px) 100vw,33vw" className="object-cover transition duration-700 group-hover:scale-105" unoptimized /> : <div className="h-full bg-gradient-to-br from-[#76283b] to-[#16070b]" />}</div><div className="p-6"><p className="eyebrow">{post.category || "Papo de Mulher"}</p><h3 className="font-display mt-3 text-3xl leading-none">{post.title}</h3><span className="mt-5 inline-flex text-xs font-bold uppercase tracking-[.16em] text-[var(--champagne)]">Continuar a conversa →</span></div></Link>)}</div> : <div className="empty-state">A próxima conversa ainda está tomando forma. Volta daqui a pouco — eu prometo contar tudo. ☕</div>}
        </section>

        <section className="section-space">
          <div className="section-kicker"><span className="eyebrow">Na minha bancada</span></div>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className="section-title">Meus<br /><em>achados honestos</em></h2>
            <Link href="/vitrine" className="ghost-button">Ver meus achados</Link>
          </div>
          {products.length ? <div className="editorial-grid">{products.map((product) => <ProductCard key={product.id} produto={product} />)}</div> : (
            <div className="empty-state"><span className="mb-3 block text-4xl">◔</span><p className="font-display text-2xl text-[var(--champagne)]">A bancada está respirando.</p><p className="mt-2">Já já entram novos achados, só os que merecerem espaço.</p><Link href="/pilulas" className="ghost-button mt-5">Quero uma pílula</Link></div>
          )}
        </section>

        <section className="glass-panel section-space rounded-[34px] px-6 py-12 text-center md:px-14">
          <p className="eyebrow">A conversa continua por lá</p>
          <h2 className="section-title my-5">Um pouco de brilho<br />no seu feed.</h2>
          <p className="muted mx-auto mb-7 max-w-xl leading-7">Bastidores, achados rápidos e aquela mensagem que começa com: amiga, olha isso.</p>
          <a href="https://instagram.com/entreluarBeauty" target="_blank" rel="noreferrer" className="luxe-button">@entreluarBeauty ↗</a>
        </section>
      </div>
    </main>
  );
}
