import Link from "next/link";

export default function Sobre() {
  return (
    <div className="min-h-screen bg-[var(--color-wine-dark)] flex flex-col font-sans">
      <div className="absolute inset-0 bg-stars opacity-30 pointer-events-none"></div>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 relative z-10 pt-16">
        <div className="mb-8">
          <Link href="/" className="text-[var(--color-gold)] hover:text-white transition-colors text-sm uppercase tracking-widest">
            &larr; Voltar
          </Link>
        </div>

        <div className="bg-[var(--color-wine)] bg-opacity-80 p-6 md:p-12 rounded-2xl shadow-2xl border border-[var(--color-wine-light)]">
          <div className="flex flex-col items-center mb-8">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-[var(--color-gold)] shadow-[0_0_30px_rgba(212,175,55,0.3)] mb-6">
              <img src="/luana.jpg" alt="Luana" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-3xl md:text-5xl font-serif text-[var(--color-gold)] text-center mb-2">A nossa história</h1>
          </div>

          <div className="text-[var(--color-gold-light)] leading-relaxed text-base md:text-xl space-y-6 font-light">
            <p>Bem-vinda, querida! Eu sou a Luana.</p>
            <p>
              Criei a Entreluar porque acredito que a maturidade é a fase mais luminosa da mulher. Durante muito tempo, a indústria da beleza tentou nos convencer de que envelhecer era um erro a ser corrigido. Aqui, nós pensamos diferente: não escondemos as nossas marcas; nós cuidamos delas com orgulho.
            </p>
            <p>
              Neste espaço, compartilho os meus segredos reais de autocuidado. Testo produtos do mundo inteiro e trago para a nossa Coleção apenas aquilo que realmente nutre, respeita e ilumina a nossa pele sob as estrelas.
            </p>
            <p>
              Mais do que uma vitrine, a Entreluar é o nosso diário, a nossa sala de estar. Um lugar para trocar confidências sobre menopausa, rir das nossas crises e celebrar o poder de ser exatamente quem somos.
            </p>
            <p className="pt-6 font-serif text-2xl md:text-3xl text-[var(--color-gold)] text-center italic">
              Sinta-se em casa!
            </p>
          </div>
        </div>

        <div className="mt-12 text-center pb-12">
          <Link href="/" className="text-[var(--color-gold)] hover:text-white transition-colors text-xs md:text-sm uppercase tracking-widest font-bold">
            &larr; Voltar para a Home
          </Link>
        </div>
      </main>
    </div>
  );
}
