"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ROUTINE_PERIODS,
  ROUTINE_STEPS,
  emptyRoutine,
  loadRoutine,
  saveRoutine,
  type Routine,
  type RoutinePeriodKey,
  type RoutineStepEntry,
  type RoutineStepKey,
} from "@/lib/routine";

export default function MinhaRotina() {
  const [routine, setRoutine] = useState<Routine>(emptyRoutine());
  const [ready, setReady] = useState(false);

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

  return (
    <main className="site-shell">
      <div className="content-wrap">
        <header className="page-intro">
          <p className="eyebrow">Sua rotina, do seu jeito</p>
          <h1 className="section-title mt-4">Minha manhã<br /><em>& minha noite</em></h1>
          <p>Marque só o que você realmente faz. Fica guardado aqui, no seu aparelho — isto é organização pessoal, não é indicação médica.</p>
        </header>

        {!ready ? (
          <p className="muted text-center">Carregando sua rotina…</p>
        ) : (
          ROUTINE_PERIODS.map((period) => (
            <section key={period.key} className="section-space">
              <div className="section-kicker"><span className="eyebrow">{period.icon} {period.label}</span></div>
              <div className="mt-6 grid gap-3">
                {ROUTINE_STEPS.map((step) => {
                  const entry = routine[period.key][step.key];
                  return (
                    <div key={step.key} className="luxe-card p-5">
                      <button
                        type="button"
                        onClick={() => toggleStep(period.key, step.key)}
                        data-active={entry.active}
                        className="poll-option-btn"
                      >
                        {step.label}
                      </button>
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
                              <button type="button" onClick={() => removeProduct(period.key, step.key)} className="text-xs text-[var(--muted)] underline">
                                remover
                              </button>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={entry.note}
                              onChange={(event) => update(period.key, step.key, { note: event.target.value })}
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
          ))
        )}
      </div>
    </main>
  );
}
