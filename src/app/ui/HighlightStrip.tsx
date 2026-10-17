import Image from "next/image";
import Link from "next/link";
import { HIGHLIGHT_META, type HighlightKind, type PickedHighlight } from "@/lib/highlights";

export type HighlightCardData = {
  id: string;
  title: string;
  image_url?: string | null;
  excerpt: string;
  href: string;
  eyebrow: string;
  cta: string;
};

export function HighlightBadge({ kind }: { kind: HighlightKind }) {
  return <span className={`highlight-badge highlight-badge--${kind}`}>{HIGHLIGHT_META[kind].badge}</span>;
}

export default function HighlightStrip({ picks, title = "Para começar por aqui" }: { picks: PickedHighlight<HighlightCardData>[]; title?: string }) {
  if (!picks.length) return null;
  return (
    <section className="highlight-strip" aria-label={title}>
      <p className="eyebrow">Escolhas da Luana</p>
      <h2 className="highlight-strip__title font-display">{title}</h2>
      <div className={`highlight-strip__grid highlight-strip__grid--${picks.length}`}>
        {picks.map(({ kind, item }, index) => (
          <article key={item.id} className={`highlight-card highlight-card--${kind}${index === 0 ? " highlight-card--lead" : ""}`}>
            <Link href={item.href} className="highlight-card__media" aria-label={item.title}>
              {item.image_url ? (
                <Image src={item.image_url} alt={item.title} fill sizes="(max-width:760px) 100vw,45vw" className="object-cover transition duration-700 hover:scale-105" unoptimized />
              ) : (
                <span className="highlight-card__placeholder">✨</span>
              )}
              <HighlightBadge kind={kind} />
            </Link>
            <div className="highlight-card__body">
              <p className="eyebrow">{item.eyebrow}</p>
              <h3 className="highlight-card__title font-display">{item.title}</h3>
              <p className="highlight-card__hook">{HIGHLIGHT_META[kind].hook}</p>
              {index === 0 && <p className="muted highlight-card__excerpt">{item.excerpt}</p>}
              <Link href={item.href} className={index === 0 ? "luxe-button" : "ghost-button"}>{item.cta}</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
