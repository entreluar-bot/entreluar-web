"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getCampaignContext } from "./CampaignTracker";

type MapName = "pele" | "travessia";
type Answers = Record<string, string | string[]>;

const skinSteps = [
  { key: "tipo", label: "Como sua pele costuma se comportar?", options: [["seca", "Mais seca ou repuxando"], ["mista", "Mista, com regiões diferentes"], ["oleosa", "Mais oleosa"], ["normal", "Sem um padrão claro"]] },
  { key: "sensibilidade", label: "Ela reclama fácil de produtos novos?", options: [["sim", "Sim, costuma arder, pinicar ou irritar"], ["nao", "Nem sempre"]] },
  { key: "mudanca", label: "O que mais mudou ultimamente?", options: [["conforto", "Ressecamento e conforto"], ["textura", "Textura, manchas ou viço"], ["linhas", "Linhas e firmeza"], ["nenhuma", "Quero só me entender melhor"]] },
  { key: "prioridade", label: "O que você quer primeiro?", options: [["simples", "Uma rotina possível"], ["entender", "Entender antes de escolher"], ["cuidado", "Cuidar com mais constância"]] },
  { key: "tempo", label: "Quanto tempo cabe no seu dia?", options: [["dois", "Dois minutos"], ["poucos", "Poucos passos"], ["ritual", "Gosto de um ritual"]] },
] as const;

const symptomOptions = [
  ["calor", "Calorões ou suores noturnos"],
  ["sono", "Sono diferente do habitual"],
  ["humor", "Humor, irritação ou ansiedade"],
  ["energia", "Energia ou concentração"],
  ["intimo", "Libido ou desconfortos íntimos"],
] as const;

function ToggleOptions({ options, value, onChange }: { options: readonly (readonly [string, string])[]; value?: string; onChange: (value: string) => void }) {
  return <div className="map-options">{options.map(([optionValue, label]) => <button key={optionValue} type="button" className="map-option" data-active={value === optionValue} onClick={() => onChange(optionValue)}>{label}</button>)}</div>;
}

export default function EntreluarMaps() {
  const [activeMap, setActiveMap] = useState<MapName | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const reset = (map: MapName) => { setActiveMap(map); setStep(0); setAnswers({}); setMessage(""); };
  const answer = (key: string, value: string) => setAnswers((current) => ({ ...current, [key]: value }));
  const toggleSymptom = (value: string) => setAnswers((current) => {
    const selected = Array.isArray(current.sintomas) ? current.sintomas : [];
    return { ...current, sintomas: selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value] };
  });
  const subscribe = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true); setMessage("");
    try {
      const response = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, source: `mapa-${activeMap}`, ...getCampaignContext() }) });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Não consegui concluir o cadastro.");
      setMessage("Pronto. A Carta Entreluar vai chegar no seu email. Suas respostas continuam só neste navegador.");
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Tente novamente em instantes."); }
    finally { setSending(false); }
  };

  if (!activeMap) return <div className="map-grid">
    <article className="map-card"><p className="eyebrow">Cuidado possível</p><h3>Meu Mapa de Pele Agora</h3><p>Olhe para tipo de pele, sensibilidade, mudança principal, prioridade e tempo disponível. A resposta é editorial, com leituras e uma rotina que já existe por aqui.</p><button className="luxe-button" onClick={() => reset("pele")}>Começar meu mapa →</button></article>
    <article className="map-card"><p className="eyebrow">Corpo em conversa</p><h3>Mapa da Minha Travessia</h3><p>Um check-in educativo sobre ciclo, sono, calorões, humor, energia, libido e desconfortos íntimos. Sem diagnóstico e sem julgamento.</p><button className="ghost-button" onClick={() => reset("travessia")}>Fazer meu check-in →</button></article>
  </div>;

  if (activeMap === "pele") {
    const current = skinSteps[step];
    const isResult = step === skinSteps.length;
    const value = answers[current?.key || ""] as string | undefined;
    const skinMessage = answers.sensibilidade === "sim" ? "Sua pele parece pedir gentileza e menos tentativas de uma vez." : answers.tipo === "seca" ? "Seu ponto de partida pode ser conforto e cuidado de barreira." : answers.tipo === "oleosa" ? "Seu ponto de partida pode ser equilíbrio, sem castigar a pele." : "Seu ponto de partida pode ser observar com calma o que funciona para você.";
    return <section className="map-workspace" aria-live="polite">
      <button className="map-back" onClick={() => setActiveMap(null)}>← Voltar aos mapas</button>
      {!isResult ? <><p className="eyebrow">Meu Mapa de Pele Agora · {step + 1} de {skinSteps.length}</p><h3>{current.label}</h3><ToggleOptions options={current.options} value={value} onChange={(next) => answer(current.key, next)} /><div className="map-actions"><button className="ghost-button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>Voltar</button><button className="luxe-button" disabled={!value} onClick={() => setStep((value) => value + 1)}>Ver próxima pergunta →</button></div></> : <MapResult map="pele" title="Seu ponto de partida" text={skinMessage} questions={["O que deixa sua pele mais confortável hoje?", "Qual passo cabe de verdade na sua rotina?"]} readingHref="/minha-rotina" readingLabel="Montar uma rotina possível" onRestart={() => reset("pele")} email={email} setEmail={setEmail} onSubscribe={subscribe} sending={sending} message={message} />}
    </section>;
  }

  const symptoms = Array.isArray(answers.sintomas) ? answers.sintomas : [];
  const isResult = step === 2;
  return <section className="map-workspace" aria-live="polite">
    <button className="map-back" onClick={() => setActiveMap(null)}>← Voltar aos mapas</button>
    {step === 0 && <><p className="eyebrow">Mapa da Minha Travessia · 1 de 2</p><h3>Você percebeu mudanças no seu ciclo ou no seu corpo recentemente?</h3><ToggleOptions options={[["sim", "Sim, e quero entender melhor"], ["nao", "Não sei ou não se aplica"]]} value={answers.ciclo as string | undefined} onChange={(next) => answer("ciclo", next)} /><div className="map-actions"><span /><button className="luxe-button" disabled={!answers.ciclo} onClick={() => setStep(1)}>Continuar →</button></div></>}
    {step === 1 && <><p className="eyebrow">Mapa da Minha Travessia · 2 de 2</p><h3>O que tem pedido mais atenção por aí?</h3><p className="muted">Marque o que fizer sentido, ou siga sem marcar nada.</p><div className="map-checks">{symptomOptions.map(([value, label]) => <label key={value}><input type="checkbox" checked={symptoms.includes(value)} onChange={() => toggleSymptom(value)} /> <span>{label}</span></label>)}</div><div className="map-actions"><button className="ghost-button" onClick={() => setStep(0)}>Voltar</button><button className="luxe-button" onClick={() => setStep(2)}>Ver meu mapa →</button></div></>}
    {isResult && <MapResult map="travessia" title="Uma direção para a sua travessia" text={symptoms.length ? "Esses sinais podem aparecer em diferentes momentos da vida e também podem ter outras explicações. Este mapa não identifica menopausa." : "Você não precisa encaixar o corpo em uma lista para merecer atenção. Este mapa é só uma forma de começar uma conversa."} questions={["Quando isso começou a mudar?", "Como isso mexe com sua rotina?", "O que eu gostaria de perguntar em uma consulta?"]} readingHref="/temas/menopausa-bem-estar" readingLabel="Ler sobre menopausa e corpo" onRestart={() => reset("travessia")} email={email} setEmail={setEmail} onSubscribe={subscribe} sending={sending} message={message} safety />}
  </section>;
}

function MapResult({ map, title, text, questions, readingHref, readingLabel, onRestart, email, setEmail, onSubscribe, sending, message, safety = false }: { map: MapName; title: string; text: string; questions: string[]; readingHref: string; readingLabel: string; onRestart: () => void; email: string; setEmail: (value: string) => void; onSubscribe: (event: FormEvent) => void; sending: boolean; message: string; safety?: boolean }) {
  return <><p className="eyebrow">{map === "pele" ? "Meu Mapa de Pele Agora" : "Mapa da Minha Travessia"}</p><h3>{title}</h3><p className="map-result__lead">{text}</p>{safety && <p className="map-safety">Isto não é diagnóstico. Se os sintomas afetam seu bem-estar ou sua saúde, vale conversar com uma profissional de saúde. <a href="https://www.who.int/news-room/fact-sheets/detail/menopause" target="_blank" rel="noreferrer">Entenda mais na OMS.</a></p>}<div className="map-questions"><p className="eyebrow">Perguntas para levar com você</p><ul>{questions.map((question) => <li key={question}>{question}</li>)}</ul></div><div className="map-actions"><Link className="luxe-button" href={readingHref}>{readingLabel} →</Link><button className="ghost-button" onClick={onRestart}>Refazer mapa</button></div><form className="map-letter" onSubmit={onSubscribe}><p className="eyebrow">Carta Entreluar opcional</p><p>Quer receber por email as leituras deste caminho? Eu uso só o seu email. As respostas deste mapa não são enviadas nem salvas.</p><label className="sr-only" htmlFor={`map-email-${map}`}>Seu melhor email</label><div><input id={`map-email-${map}`} required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Seu melhor email" /><button className="newsletter-submit" disabled={sending} type="submit">{sending ? "…" : "Quero receber a Carta"}</button></div>{message && <p className="newsletter-message" role="status">{message}</p>}</form></>;
}
