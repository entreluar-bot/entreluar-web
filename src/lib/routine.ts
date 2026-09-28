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

export type RoutinePeriod = Record<RoutineStepKey, RoutineStepEntry> & { order: RoutineStepKey[] };

export type RoutineMeta = {
  skinType?: "oleosa" | "seca" | "mista" | "normal";
  sensitive?: boolean;
  origin?: "brasileiro" | "coreano" | "indiferente";
  concernSlug?: string;
  complexity?: "essencial" | "completa";
};

export type Routine = { manha: RoutinePeriod; noite: RoutinePeriod; meta?: RoutineMeta };

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

const DEFAULT_ORDER: RoutineStepKey[] = ROUTINE_STEPS.map((step) => step.key);

export const ROUTINE_STEP_LABELS: Record<RoutineStepKey, string> = ROUTINE_STEPS.reduce(
  (acc, step) => ({ ...acc, [step.key]: step.label }),
  {} as Record<RoutineStepKey, string>,
);

export const ROUTINE_PERIODS: Array<{ key: RoutinePeriodKey; label: string; icon: string }> = [
  { key: "manha", label: "Minha manhã", icon: "☀️" },
  { key: "noite", label: "Minha noite", icon: "🌙" },
];

const STORAGE_KEY = "entreluar_minha_rotina";

function emptyPeriod(): RoutinePeriod {
  const period = ROUTINE_STEPS.reduce((acc, step) => {
    acc[step.key] = { active: false, note: "", product: null };
    return acc;
  }, {} as RoutinePeriod);
  period.order = [...DEFAULT_ORDER];
  return period;
}

export function emptyRoutine(): Routine {
  return { manha: emptyPeriod(), noite: emptyPeriod() };
}

function normalizeOrder(order: unknown): RoutineStepKey[] {
  const valid = new Set(DEFAULT_ORDER);
  const fromStorage = Array.isArray(order) ? order.filter((key): key is RoutineStepKey => valid.has(key as RoutineStepKey)) : [];
  const missing = DEFAULT_ORDER.filter((key) => !fromStorage.includes(key));
  return [...fromStorage, ...missing];
}

function normalizePeriod(fallback: RoutinePeriod, parsed: Partial<RoutinePeriod> | undefined): RoutinePeriod {
  const merged = { ...fallback, ...(parsed || {}) } as RoutinePeriod;
  merged.order = normalizeOrder(parsed?.order);
  return merged;
}

export function loadRoutine(): Routine {
  const fallback = emptyRoutine();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Routine>;
    return {
      manha: normalizePeriod(fallback.manha, parsed.manha),
      noite: normalizePeriod(fallback.noite, parsed.noite),
      meta: parsed.meta,
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

export function reorderStep(routine: Routine, period: RoutinePeriodKey, fromIndex: number, toIndex: number): Routine {
  const order = [...routine[period].order];
  if (fromIndex < 0 || fromIndex >= order.length || toIndex < 0 || toIndex >= order.length) return routine;
  const [moved] = order.splice(fromIndex, 1);
  order.splice(toIndex, 0, moved);
  const next: Routine = { ...routine, [period]: { ...routine[period], order } };
  saveRoutine(next);
  return next;
}
