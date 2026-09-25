"use client";

import { useState } from "react";
import Link from "next/link";
import JournalCard from "../ui/JournalCard";
import ProductCard from "../ProductCard";
import FilterChipBar from "../ui/FilterChipBar";
import type { JournalPost, Product } from "../types";

type ConcernTag = { slug: string; name: string };
type Routine = "essencial" | "alguns-passos" | "completa";
type TagContentResult = { tag: { name: string; slug: string } | null; papo: JournalPost[]; estudei: JournalPost[]; vitrine: Product[] };

const ROUTINE_OPTIONS: Array<{ key: Routine; label: string }> = [
  { key: "essencial", label: "Quero o essencial" },
  { key: "alguns-passos", label: "Posso fazer alguns passos" },
  { key: "completa", label: "Amo uma rotina completa" },
];

const ROUTINE_INTRO: Record<Routine, string> = {
  essencial: "Como você curte ir direto ao ponto, comecei pelo que resolve mais rápido:",
  "alguns-passos": "Como você topa alguns passos a mais, separei um pouco de tudo:",
  completa: "Como você ama se dedicar, trouxe tudo que encontrei sobre isso:",
};

export default function QuizWizard({ concernTags }: { concernTags: ConcernTag[] }) {
  const [step, setStep] = useState<"concern" | "routine" | "result">("concern");
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [result, setResult] = useState<TagContentResult | null>(null);
  const [loading, setLoading] = useState(false);

  const chooseRoutine = async (value: string) => {
    const routineValue = value as Routine;
    setRoutine(routineValue);
    setStep("result");
  };

  const chooseConcern = async (slug: string) => {
    setLoading(true);
    setStep("routine");
    try {
      const response = await fetch(`/api/tag-content?slug=${encodeURIComponent(slug)}`);
      setResult(await response.json());
    } catch {
      setResult({ tag: null, papo: [], estudei: [], vitrine: [] });
    }
    setLoading(false);
  };

  const restart = () => {
    setStep("concern");
    setRoutine(null);
    setResult(null);
  };

  if (step === "concern") {
    return (
      <section aria-labelledby="quiz-step1-title">
        <p className="eyebrow">Passo 1 de 2</p>
        <h2 id="quiz-step1-title" className="section-title mt-4">O que você quer<br /><em>cuidar hoje?</em></h2>
        <FilterChipBar
          ariaLabel="O que você quer cuidar hoje?"
          activeKey=""
          onSelect={chooseConcern}
          options={concernTags.map((tag) => ({ key: tag.slug, label: tag.name }))}
        />
        <Link href="/temas" className="ghost-button mt-6 inline-flex">Não sei por onde começar →</Link>
      </section>
    );
  }

  if (step === "routine") {
    return (
      <section aria-labelledby="quiz-step2-title">
        <p className="eyebrow">Passo 2 de 2</p>
        <h2 id="quiz-step2-title" className="section-title mt-4">Como você prefere<br /><em>sua rotina?</em></h2>
        <FilterChipBar ariaLabel="Como você prefere sua rotina?" activeKey="" onSelect={chooseRoutine} options={ROUTINE_OPTIONS.map((option) => ({ key: option.key, label: option.label }))} />
        <button type="button" onClick={() => setStep("concern")} className="ghost-button mt-6">← Voltar</button>
      </section>
    );
  }

  return (
    <section aria-labelledby="quiz-result-title">
      <p className="eyebrow">Seu caminho Entreluar</p>
      <h2 id="quiz-result-title" className="section-title mt-4">{result?.tag?.name || "Separando pra você…"}</h2>

      {loading ? (
        <p className="muted mt-6">Separando o que combina com você…</p>
      ) : (
        <>
          {routine && <p className="muted mt-4 max-w-2xl text-base leading-8">{ROUTINE_INTRO[routine]}</p>}

          <div className="section-space">
            <p className="eyebrow mb-4">Para entender</p>
            {result?.papo.length ? (
              <div className="editorial-grid">{result.papo.map((post) => <JournalCard key={post.id} post={post} href={`/blog/${post.id}`} />)}</div>
            ) : (
              <div className="empty-state">Ainda não tenho papo marcado com esse tema. <Link href="/temas" className="underline">Explorar por tema →</Link></div>
            )}
          </div>

          <div className="section-space">
            <p className="eyebrow mb-4">Ativos que vale conhecer</p>
            {result?.estudei.length ? (
              <div className="editorial-grid">{result.estudei.map((post) => <JournalCard key={post.id} post={post} href={`/resenhas/${post.id}`} />)}</div>
            ) : (
              <div className="empty-state">Ainda não tenho artigo marcado com esse tema. <Link href="/resenhas" className="underline">Ver tudo que já expliquei →</Link></div>
            )}
          </div>

          <div className="section-space">
            <p className="eyebrow mb-4">O que já testei</p>
            {result?.vitrine.length ? (
              <div className="editorial-grid">{result.vitrine.map((product) => <ProductCard key={product.id} produto={product} />)}</div>
            ) : (
              <div className="empty-state">Ainda não tenho achado marcado com esse tema. <Link href="/vitrine" className="underline">Ver a bancada →</Link></div>
            )}
          </div>
        </>
      )}

      <button type="button" onClick={restart} className="ghost-button mt-4">Recomeçar</button>
    </section>
  );
}
