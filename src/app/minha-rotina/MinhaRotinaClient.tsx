"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ROUTINE_PERIODS,
  ROUTINE_STEP_LABELS,
  emptyRoutine,
  loadRoutine,
  saveRoutine,
  reorderStep,
  type Routine,
  type RoutinePeriodKey,
  type RoutineStepEntry,
  type RoutineStepKey,
} from "@/lib/routine";
import RoutineWizard from "./RoutineWizard";
import RoutineShareCard from "../ui/RoutineShareCard";
import RoutineShareButton from "./RoutineShareButton";

type ConcernTag = { slug: string; name: string };

export default function MinhaRotinaClient({ concernTags }: { concernTags: ConcernTag[] }) {
  const [routine, setRoutine] = useState<Routine>(emptyRoutine());
  const [ready, setReady] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setRoutine(loadRoutine());
      setReady(true);
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  const update = (period: RoutinePeriodKey, step: RoutineStepKey, patch: Partial<RoutineStepEntry>) => {
    setRoutine((prev) => {
      const next: Routine = { ...prev, [period]: { ...prev[period], [step]: { ...prev[period][step], ...patch } } };
      saveRoutine(next);
      return next;
    });
  };

  const toggleStep = (period: RoutinePeriodKey, step: RoutineStepKey) => {
    update(period, step, { active: !routine[period][step].active });
  };

  const removeProduct = (period: RoutinePeriodKey, step: RoutineStepKey) => {
    update(period, step, { product: null });
  };

  const moveStep = (period: RoutinePeriodKey, step: RoutineStepKey, direction: -1 | 1) => {
    const order = routine[period].order;
    const fromIndex = order.indexOf(step);
    const toIndex = fromIndex + direction;
    if (fromIndex < 0 || toIndex < 0 || toIndex >= order.length) return;
    setRoutine((prev) => reorderStep(prev, period, fromIndex, toIndex));
  };

  const applyGeneratedRoutine = (generated: Routine) => {
    saveRoutine(generated);
    setRoutine(generated);
    setWizardOpen(false);
  };

  return (
    <main className="site-shell">
      <div className="content-wrap">
        <header className="page-intro">
          <p className="eyebrow">Sua rotina, do seu jeito</p>
          <h1 className="section-title mt-4">Minha manhã<br /><em>& minha noite</em></h1>
          <p>Marque só o que você realmente faz, na ordem que funciona pra você. Fica guardado aqui, no seu aparelho — isto é organização pessoal, não é indicação médica.</p>
        </header>

        {!ready ? (
          <p className="muted text-center">Carregando sua rotina…</p>
        ) : wizardOpen ? (
          <div className="section-space">
            <RoutineWizard concernTags={concernTags} onGenerated={applyGeneratedRoutine} onCancel={() => setWizardOpen(false)} />
          </div>
        ) : (
          <>
            <div className="section-space flex flex-col items-center gap-3 text-center">
              <button type="button" onClick={() => setWizardOpen(true)} className="luxe-button">
                ✨ Montar minha rotina automaticamente
              </button>
              <p className="muted text-sm">Responda 5 perguntas rápidas e eu já preencho manhã e noite pra você.</p>
            </div>

            {ROUTINE_PERIODS.map((period) => (
              <section key={period.key} className="section-space">
                <div className="section-kicker"><span className="eyebrow">{period.icon} {period.label}</span></div>
                <div className="mt-6 grid gap-3">
                  {routine[period.key].order.map((stepKey, index) => {
                    const entry = routine[period.key][stepKey];
                    const order = routine[period.key].order;
                    return (
                      <div key={stepKey} className="luxe-card p-5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleStep(period.key, stepKey)}
                            data-active={entry.active}
                            className="poll-option-btn flex-1"
                          >
                            {ROUTINE_STEP_LABELS[stepKey]}
                          </button>
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => moveStep(period.key, stepKey, -1)}
                              disabled={index === 0}
                              aria-label={`Mover ${ROUTINE_STEP_LABELS[stepKey]} para cima`}
                              className="text-xs text-[var(--muted)] disabled:opacity-30"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => moveStep(period.key, stepKey, 1)}
                              disabled={index === order.length - 1}
                              aria-label={`Mover ${ROUTINE_STEP_LABELS[stepKey]} para baixo`}
                              className="text-xs text-[var(--muted)] disabled:opacity-30"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                        {entry.active && (
                          <div className="mt-4">
                            {entry.product ? (
                              <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white/[.03] p-3">
                                {entry.product.image_url && (
                                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                                    <Image src={entry.product.image_url} alt={entry.product.title} fill sizes="56px" className="object-cover" unoptimized />
                                  </div>
                                )}
                                <p className="flex-1 text-sm font-bold text-[var(--champagne-pale)]">{entry.product.title}</p>
                                <button type="button" onClick={() => removeProduct(period.key, stepKey)} className="text-xs text-[var(--muted)] underline">
                                  remover
                                </button>
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={entry.note}
                                onChange={(event) => update(period.key, stepKey, { note: event.target.value })}
                                placeholder="Qual produto ou marca você usa aqui?"
                                className="w-full px-4 py-3 text-sm"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            <section className="section-space">
              <div className="section-kicker"><span className="eyebrow">Sua rotina ficou boa? Mostra pra alguém ✨</span></div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <RoutineShareCard routine={routine} />
                <RoutineShareButton routine={routine} />
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
