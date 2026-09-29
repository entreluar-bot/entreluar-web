"use client";

import { useEffect, useRef, useState } from "react";
import type { RoutineCandidate } from "../api/routine-candidates/route";
import { generateRoutine, type RoutineCriteria } from "@/lib/routine-generator";
import type { Routine } from "@/lib/routine";

type ConcernTag = { slug: string; name: string };
type WizardStep = "skinType" | "sensitive" | "origin" | "concern" | "complexity" | "generating" | "done";
type WizardOption = { key: string; label: string };

const SKIN_TYPE_OPTIONS: Array<{ key: RoutineCriteria["skinType"]; label: string }> = [
  { key: "oleosa", label: "Oleosa" },
  { key: "seca", label: "Seca" },
  { key: "mista", label: "Mista" },
  { key: "normal", label: "Normal" },
];

const SENSITIVE_OPTIONS = [
  { key: "sim", label: "Sim, é sensível" },
  { key: "nao", label: "Não é sensível" },
];

const ORIGIN_OPTIONS: Array<{ key: RoutineCriteria["origin"]; label: string }> = [
  { key: "brasileiro", label: "Prefiro brasileiro" },
  { key: "coreano", label: "Prefiro coreano" },
  { key: "indiferente", label: "Tanto faz" },
];

const COMPLEXITY_OPTIONS: Array<{ key: RoutineCriteria["complexity"]; label: string }> = [
  { key: "essencial", label: "Quero o essencial" },
  { key: "completa", label: "Amo uma rotina completa" },
];

function WizardSelect({ ariaLabel, options, onSelect }: { ariaLabel: string; options: WizardOption[]; onSelect: (key: string) => void }) {
  return (
    <select
      aria-label={ariaLabel}
      defaultValue=""
      onChange={(event) => event.target.value && onSelect(event.target.value)}
      className="mt-4 w-full px-4 py-3 text-sm"
    >
      <option value="" disabled>Escolher…</option>
      {options.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
    </select>
  );
}

export default function RoutineWizard({ concernTags, onGenerated, onCancel }: { concernTags: ConcernTag[]; onGenerated: (routine: Routine) => void; onCancel: () => void }) {
  const [step, setStep] = useState<WizardStep>("skinType");
  const [criteria, setCriteria] = useState<Partial<RoutineCriteria>>({});
  const [candidates, setCandidates] = useState<RoutineCandidate[] | null>(null);
  const hasGenerated = useRef(false);

  useEffect(() => {
    fetch("/api/routine-candidates")
      .then((response) => response.json())
      .then((data) => setCandidates(data.candidates || []))
      .catch(() => setCandidates([]));
  }, []);

  useEffect(() => {
    if (step !== "generating" || !candidates?.length || hasGenerated.current) return;
    hasGenerated.current = true;
    onGenerated(generateRoutine(candidates, criteria as RoutineCriteria));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, candidates]);

  const noCandidates = step === "generating" && candidates !== null && candidates.length === 0;

  const choose = (patch: Partial<RoutineCriteria>, next: WizardStep) => {
    setCriteria((prev) => ({ ...prev, ...patch }));
    setStep(next);
  };

  return (
    <div className="glass-panel rounded-[22px] p-6">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Monte automaticamente</p>
        <button type="button" onClick={onCancel} className="text-xs text-[var(--muted)] underline">cancelar</button>
      </div>

      {step === "skinType" && (
        <>
          <h3 className="section-title mt-4 text-2xl">Como é sua pele?</h3>
          <WizardSelect ariaLabel="Tipo de pele" onSelect={(key) => choose({ skinType: key as RoutineCriteria["skinType"] }, "sensitive")} options={SKIN_TYPE_OPTIONS} />
        </>
      )}

      {step === "sensitive" && (
        <>
          <h3 className="section-title mt-4 text-2xl">Sua pele é sensível?</h3>
          <WizardSelect ariaLabel="Sensibilidade" onSelect={(key) => choose({ sensitive: key === "sim" }, "origin")} options={SENSITIVE_OPTIONS} />
        </>
      )}

      {step === "origin" && (
        <>
          <h3 className="section-title mt-4 text-2xl">Alguma preferência de origem?</h3>
          <WizardSelect ariaLabel="Origem preferida" onSelect={(key) => choose({ origin: key as RoutineCriteria["origin"] }, "concern")} options={ORIGIN_OPTIONS} />
        </>
      )}

      {step === "concern" && (
        <>
          <h3 className="section-title mt-4 text-2xl">Sua principal preocupação hoje?</h3>
          {concernTags.length ? (
            <WizardSelect ariaLabel="Preocupação principal" onSelect={(key) => choose({ concernSlug: key }, "complexity")} options={concernTags.map((tag) => ({ key: tag.slug, label: tag.name }))} />
          ) : (
            <button type="button" onClick={() => choose({ concernSlug: undefined }, "complexity")} className="ghost-button mt-4">Pular esta pergunta</button>
          )}
        </>
      )}

      {step === "complexity" && (
        <>
          <h3 className="section-title mt-4 text-2xl">Como você prefere sua rotina?</h3>
          <WizardSelect ariaLabel="Complexidade da rotina" onSelect={(key) => choose({ complexity: key as RoutineCriteria["complexity"] }, "generating")} options={COMPLEXITY_OPTIONS} />
        </>
      )}

      {step === "generating" && (
        noCandidates
          ? <p className="muted mt-4">Ainda não tenho produtos marcados por fase de rotina para gerar automaticamente. Volte em breve! 💛</p>
          : <p className="muted mt-4">Separando o que combina com você…</p>
      )}
    </div>
  );
}
