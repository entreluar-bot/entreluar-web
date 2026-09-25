"use client";

import Link from "next/link";
import { useState } from "react";
import { ROUTINE_PERIODS, ROUTINE_STEPS, addProductToStep, type RoutinePeriodKey, type RoutineStepKey } from "@/lib/routine";

export default function AddToRoutineButton({ id, title, image_url, className = "" }: { id: string; title: string; image_url?: string | null; className?: string }) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<RoutinePeriodKey>("manha");
  const [step, setStep] = useState<RoutineStepKey>("serum");
  const [savedLabel, setSavedLabel] = useState("");

  const confirm = () => {
    addProductToStep(period, step, { id, title, image_url });
    const periodLabel = ROUTINE_PERIODS.find((item) => item.key === period)?.label || "";
    setSavedLabel(periodLabel);
    setOpen(false);
  };

  if (savedLabel) {
    return (
      <p className={`share-message mt-4 ${className}`} role="status">
        Adicionado à sua {savedLabel.toLowerCase()} ✨ <Link href="/minha-rotina" className="underline">Ver minha rotina →</Link>
      </p>
    );
  }

  return (
    <div className={`mt-4 ${className}`}>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="ghost-button">
          + Adicionar à minha rotina
        </button>
      ) : (
        <div className="glass-panel rounded-[22px] p-4">
          <p className="eyebrow mb-3">Em qual passo entra esse produto?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={period} onChange={(event) => setPeriod(event.target.value as RoutinePeriodKey)} className="px-3 py-2 text-sm">
              {ROUTINE_PERIODS.map((item) => <option key={item.key} value={item.key}>{item.icon} {item.label}</option>)}
            </select>
            <select value={step} onChange={(event) => setStep(event.target.value as RoutineStepKey)} className="px-3 py-2 text-sm">
              {ROUTINE_STEPS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="ghost-button flex-1">Cancelar</button>
            <button type="button" onClick={confirm} className="luxe-button flex-1">Adicionar</button>
          </div>
        </div>
      )}
    </div>
  );
}
