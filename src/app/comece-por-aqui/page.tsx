import Link from "next/link";

const paths = [
  { href: "/temas/pele", label: "Quero cuidar melhor da minha pele" },
  { href: "/resenhas", label: "Quero entender o que realmente funciona" },
  { href: "/resenhas", label: "Quero saber o que você testou" },
  { href: "/temas/menopausa-bem-estar", label: "Estou vivendo as mudanças dos 50+" },
  { href: "/blog", label: "Quero conversar, rir e me identificar" },
  { href: "/vitrine", label: "Quero descobrir produtos que realmente foram testados" },
  { href: "/temas", label: "Não sei por onde começar" },
];

export default function ComecePorAqui() {
  return (
    <main className="site-shell">
      <div className="content-wrap">
        <header className="page-intro">
          <p className="eyebrow">Chegou agora? Vem comigo.</p>
          <h1 className="section-title mt-4">Comece<br /><em>por aqui</em></h1>
          <p>Escolha o que combina com você hoje. Não precisa entender o site inteiro de uma vez — eu te levo direto pra conversa certa.</p>
        </header>

        <section className="section-space grid gap-4 md:grid-cols-2">
          {paths.map((path, index) => (
            <Link key={`${path.href}-${index}`} href={path.href} className="luxe-card flex items-center justify-between gap-4 p-6 font-display text-xl leading-tight md:text-2xl">
              {path.label}
              <span className="text-[var(--champagne)]" aria-hidden="true">→</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
