import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import ProductCard from "./ProductCard";
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
  ] = await Promise.all([
    supabase.from("products").select("*").order("created_at", { ascending: false }).limit(3),
    supabase.from("quotes").select("*").order("created_at", { ascending: true }),
    supabase.from("journal").select("*").order("created_at", { ascending: false }).limit(3),
    supabase.from("products").select("id,title,image_url,is_new,created_at").eq("is_new", true).order("created_at", { ascending: false }).limit(1),
    supabase.from("journal").select("id,title,is_new,created_at").eq("is_new", true).or('category.is.null,category.neq."Estudei para te explicar"').order("created_at", { ascending: false }).limit(1),
    supabase.from("journal").select("id,title,is_new,created_at").eq("is_new", true).eq("category", "Estudei para te explicar").order("created_at", { ascending: false }).limit(1),
  ]);

  const products = (productRows || []) as Product[];
  const quotes = (quoteRows || []) as Quote[];
  const posts = (journalRows || []) as JournalPost[];
  const newProduct = ((newProductRows || []) as Product[])[0] || null;
  const newPapo = ((newPapoRows || []) as JournalPost[])[0] || null;
  const newReview = ((newReviewRows || []) as JournalPost[])[0] || null;
  const quote = getDailyQuote(quotes);
  const portalImage = newProduct?.image_url || products[0]?.image_url;

  return (
    <main className="site-shell home-shell">
      <div className="content-wrap">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Pele madura • vida sem manual</p>
            <h1 className="display-title">Madura.<br /><em>Luminosa.</em><br />Sem pedir licença.</h1>
            <p className="hero-intro">Eu testo os potinhos, estudo a pele e também puxo aquela cadeira para falar de menopausa, corpo, recomeços, descanso, beleza e liberdade — como conversa boa entre mulheres maduras.</p>
            <nav className="home-portals" aria-label="Escolha por onde começar">
              <HomePortal href={newProduct ? `/vitrine/${newProduct.id}` : "/vitrine"} title="Vitrine" subtitle="Meus achados" isNew={Boolean(newProduct)} primary imageUrl={portalImage} />
              <HomePortal href={newPapo ? `/blog/${newPapo.id}` : "/blog"} title="Papo de Mulher" subtitle="Maturidade sem manual" isNew={Boolean(newPapo)} />
              <HomePortal href={newReview ? `/resenhas/${newReview.id}` : "/resenhas"} title="Te Explico" subtitle="Sem complicar" isNew={Boolean(newReview)} />
            </nav>
          </div>
          <div className="hero-portrait">
            <Image src="/luana.jpg" alt="Luana, fundadora da Entreluar" fill priority sizes="(max-width:760px) 100vw,55vw" />
            <div className="hero-seal">Entre beleza<br />e vivência<br />existe você</div>
          </div>
        </section>

        <section className="quote-ribbon glass-panel" aria-label="Pílula de hoje">
          <p className="eyebrow mb-3">Pílula de hoje ☾</p>
          <blockquote>“{quote?.quote || "A maturidade não apaga o nosso brilho — ela finalmente ensina onde acender a luz."}”</blockquote>
          <Link href="/pilulas" className="mt-4 inline-flex min-h-11 items-center text-xs font-bold uppercase tracking-[.18em] text-[var(--champagne)]">Quero outra dose →</Link>
        </section>

        <section className="section-space">
          <div className="section-kicker"><span className="eyebrow">Escolha seu momento de hoje</span></div>
          <div className="intent-grid">
            <Link href="/resenhas" className="intent-tile"><span>Entender minha pele</span><strong>Estudei para te explicar sem complicar, sem susto e sem promessa milagrosa.</strong></Link>
            <Link href="/blog" className="intent-tile"><span>Conversar sobre maturidade</span><strong>Menopausa, corpo em mudança, recomeços e vida real com humor de amiga.</strong></Link>
            <Link href="/vitrine" className="intent-tile"><span>Ver achados honestos</span><strong>O que vale a bancada, seu dinheiro, sua atenção e o espaço no nécessaire.</strong></Link>
            <Link href="/pilulas" className="intent-tile"><span>Respirar em um minuto</span><strong>Uma dose curta para voltar para si sem transformar tudo em manual.</strong></Link>
          </div>
        </section>

        <section className="section-space">
          <div className="section-kicker"><span className="eyebrow">Testado sem cerimônia</span></div>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className="section-title">O que ficou<br /><em>na minha bancada</em></h2>
            <Link href="/vitrine" className="ghost-button">Ver todos os achados</Link>
          </div>
          {products.length ? <div className="editorial-grid">{products.map((product) => <ProductCard key={product.id} produto={product} />)}</div> : (
            <div className="empty-state"><span className="mb-3 block text-4xl">◔</span><p className="font-display text-2xl text-[var(--champagne)]">A bancada está respirando.</p><p className="mt-2">Já já entram novos achados — só os que merecerem espaço.</p><Link href="/pilulas" className="ghost-button mt-5">Quero uma pílula</Link></div>
          )}
        </section>

        <section className="section-space grid gap-8 md:grid-cols-[.8fr_1.2fr] md:items-center">
          <div className="relative min-h-[420px] overflow-hidden rounded-[32px_32px_120px_32px] border border-[var(--line)]"><Image src="/luana.jpg" alt="Luana em seu espaço" fill sizes="(max-width:760px) 100vw,40vw" className="object-cover object-[center_35%]" /></div>
          <div><p className="eyebrow">Prazer, eu sou a Luana</p><h2 className="section-title mt-4">Mais vida.<br />Menos manual.</h2><p className="muted my-6 max-w-xl text-base leading-8">Eu testo, estudo, acerto, erro também — e conto tudo. Porque amadurecer não é desaparecer: é finalmente escolher o que fica.</p><Link href="/sobre" className="luxe-button">Chega mais →</Link></div>
        </section>

        <section className="section-space">
          <div className="section-kicker"><span className="eyebrow">Conversas que ficam</span></div>
          <h2 className="section-title mb-8">Entre nós,<br /><em>sem filtro</em></h2>
          {posts.length ? <div className="editorial-grid">{posts.map((post) => <Link key={post.id} href={post.category === "Estudei para te explicar" ? `/resenhas/${post.id}` : `/blog/${post.id}`} className="luxe-card group block"><div className="relative aspect-[4/3]">{post.image_url ? <Image src={post.image_url} alt="" fill sizes="(max-width:760px) 100vw,33vw" className="object-cover transition duration-700 group-hover:scale-105" unoptimized /> : <div className="h-full bg-gradient-to-br from-[#76283b] to-[#16070b]" />}</div><div className="p-6"><p className="eyebrow">{post.category || "Papo de Mulher"}</p><h3 className="font-display mt-3 text-3xl leading-none">{post.title}</h3><span className="mt-5 inline-flex text-xs font-bold uppercase tracking-[.16em] text-[var(--champagne)]">Continuar a conversa →</span></div></Link>)}</div> : <div className="empty-state">A próxima conversa ainda está tomando forma. Volta daqui a pouco — eu prometo contar tudo. ☕</div>}
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
