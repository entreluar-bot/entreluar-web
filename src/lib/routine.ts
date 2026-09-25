export type RoutineStepKey =
  | "limpeza"
  | "serum"
  | "tratamento"
  | "area_olhos"
  | "hidratante"
  | "protetor_solar"
  | "cabelo"
  | "suplementos";

export type RoutinePeriodKey = "manha" | "noite";

export type RoutineProductRef = { id: string; title: string; image_url?: string | null };

export type RoutineStepEntry = { active: boolean; note: string; product?: RoutineProductRef | null };

export type RoutinePeriod = Record<RoutineStepKey, RoutineStepEntry>;

export type Routine = { manha: RoutinePeriod; noite: RoutinePeriod };

export const ROUTINE_STEPS: Array<{ key: RoutineStepKey; label: string }> = [
  { key: "limpeza", label: "Limpeza" },
  { key: "serum", label: "Sérum" },
  { key: "tratamento", label: "Tratamento" },
  { key: "area_olhos", label: "Área dos olhos" },
  { key: "hidratante", label: "Hidratante" },
  { key: "protetor_solar", label: "Protetor solar" },
  { key: "cabelo", label: "Cabelo" },
  { key: "suplementos", label: "Suplementos" },
];

export const ROUTINE_PERIODS: Array<{ key: RoutinePeriodKey; label: string; icon: string }> = [
  { key: "manha", label: "Minha manhã", icon: "☀️" },
  { key: "noite", label: "Minha noite", icon: "🌙" },
];

const STORAGE_KEY = "entreluar_minha_rotina";

function emptyPeriod(): RoutinePeriod {
  return ROUTINE_STEPS.reduce((period, step) => {
    period[step.key] = { active: false, note: "", product: null };
    return period;
  }, {} as RoutinePeriod);
}

export function emptyRoutine(): Routine {
  return { manha: emptyPeriod(), noite: emptyPeriod() };
}

export function loadRoutine(): Routine {
  const fallback = emptyRoutine();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Routine>;
    return {
      manha: { ...fallback.manha, ...(parsed.manha || {}) },
      noite: { ...fallback.noite, ...(parsed.noite || {}) },
    };
  } catch {
    return fallback;
  }
}

export function saveRoutine(routine: Routine) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(routine));
  } catch {
    // localStorage indisponível (aba privada, storage bloqueado) — a rotina só não persiste desta vez.
  }
}

export function addProductToStep(period: RoutinePeriodKey, step: RoutineStepKey, product: RoutineProductRef): Routine {
  const routine = loadRoutine();
  routine[period][step] = { ...routine[period][step], active: true, product };
  saveRoutine(routine);
  return routine;
}
