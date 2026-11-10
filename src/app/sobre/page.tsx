import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "/blog", label: "Entrar no Papo de Mulher" },
  { href: "/resenhas", label: "Ver o que eu estudo para te explicar" },
  { href: "/vitrine", label: "Conhecer meus achados" },
];

export default function Sobre() {
  return <main className="site-shell"><div className="content-wrap">
    <section className="grid gap-8 md:grid-cols-[.9fr_1.1fr] md:items-center">
      <div className="relative min-h-[580px] overflow-hidden rounded-[36px_36px_150px_36px] border border-[var(--line)] shadow-2xl"><Image src="/luana.jpg" alt="Luana, criadora da Entreluar" fill priority sizes="(max-width:760px) 100vw,45vw" className="object-cover" /></div>
      <div><p className="eyebrow">Quem eu sou e por que criei esse espaço</p><h1 className="section-title my-5">A vida continua.<br /><em>E a conversa também.</em></h1><div className="prose-luxe space-y-5">
        <p>Eu sou a Luana. Tenho 54 anos, sou divorciada, mãe de uma filha de 18 e uma mulher que trabalha, se cuida, namora, erra a mão às vezes e segue aprendendo a viver uma fase que ninguém ensinou direito pra gente.</p>
        <p>Em 2027, ser 50+ não é ficar olhando para trás nem tentar caber na ideia de “mulher madura” que inventaram para nós. Eu ainda tenho vontade, dúvidas, planos, preguiça, coragem em alguns dias e uma bela vontade de mandar certas expectativas para bem longe em outros.</p>
        <p>Eu senti falta de um lugar onde fosse possível falar disso sem constrangimento. Das mudanças no corpo, da menopausa, da pele que muda, do sono que resolve ter personalidade própria. Mas também de namoro depois dos 50, sexo, filhos crescendo, separação, solidão, trabalho, liberdade, beleza, medo, recomeços e das pequenas situações que só outra mulher vivendo essa fase entende de verdade.</p>
        <p>A Entreluar nasceu dessa falta.</p>
        <p>Não quero te entregar uma fórmula para parecer mais nova, nem fingir que um creme resolve tudo, embora eu adore descobrir os que realmente valem espaço na bancada. Quero dividir o que estudo, o que testo, o que penso e até os meus deslizes. Quero que a gente possa trocar experiências sem competição, sem julgamento e sem precisar parecer bem resolvida o tempo todo.</p>
        <p>Aqui, beleza não é obrigação. Autocuidado não é tarefa. E maturidade não é despedida de nada.</p>
        <p>É vida acontecendo, com mais história, mais critério e, espero, mais liberdade para ser quem a gente é.</p>
        <p className="font-display text-3xl italic text-[var(--champagne)]">Pode chegar. Essa conversa também é sua.</p>
      </div></div>
    </section>
    <section className="section-space"><div className="section-kicker"><span className="eyebrow">Escolha a próxima conversa</span></div><div className="grid gap-4 md:grid-cols-3">{links.map((link) => <Link href={link.href} key={link.href} className="luxe-card flex items-center justify-between p-6 font-display text-2xl">{link.label}<span className="text-[var(--champagne)]">→</span></Link>)}</div></section>
  </div></main>;
}
