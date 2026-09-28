export type RoutineStepKey = "limpar" | "tonificar" | "tratar" | "hidratar" | "proteger";

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
  { key: "limpar", label: "Limpar" },
  { key: "tonificar", label: "Tonificar" },
  { key: "tratar", label: "Tratar" },
  { key: "hidratar", label: "Hidratar" },
  { key: "proteger", label: "Proteger" },
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

// Rotinas salvas antes da simplificação da fase (8 passos -> 5) usavam essas
// chaves. Mapeamos pra continuar carregando o que já foi salvo no aparelho da
// usuária sem quebrar a página; "área dos olhos", "cabelo" e "suplementos"
// não têm mais passo equivalente, então esses dados só deixam de aparecer.
const LEGACY_STEP_KEY_MAP: Record<string, RoutineStepKey> = {
  limpeza: "limpar",
  serum: "tonificar",
  tratamento: "tratar",
  hidratante: "hidratar",
  protetor_solar: "proteger",
};

function remapLegacyKey(key: string): RoutineStepKey | null {
  if ((DEFAULT_ORDER as string[]).includes(key)) return key as RoutineStepKey;
  return LEGACY_STEP_KEY_MAP[key] || null;
}

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
  const fromStorage = Array.isArray(order)
    ? order.map((key) => remapLegacyKey(String(key))).filter((key): key is RoutineStepKey => key !== null)
    : [];
  const deduped = [...new Set(fromStorage)];
  const missing = DEFAULT_ORDER.filter((key) => !deduped.includes(key));
  return [...deduped, ...missing];
}

function remapPeriodEntries(parsed: Record<string, unknown> | undefined): Partial<Record<RoutineStepKey, RoutineStepEntry>> {
  const remapped: Partial<Record<RoutineStepKey, RoutineStepEntry>> = {};
  if (!parsed) return remapped;
  for (const [key, value] of Object.entries(parsed)) {
    if (key === "order") continue;
    const newKey = remapLegacyKey(key);
    if (newKey) remapped[newKey] = value as RoutineStepEntry;
  }
  return remapped;
}

function normalizePeriod(fallback: RoutinePeriod, parsed: Partial<RoutinePeriod> | undefined): RoutinePeriod {
  const merged = { ...fallback, ...remapPeriodEntries(parsed as Record<string, unknown> | undefined) } as RoutinePeriod;
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
