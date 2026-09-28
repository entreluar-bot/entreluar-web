export type RoutineStepKey =
  | "limpeza"
  | "tonico"
  | "serum"
  | "tratamento"
  | "area_olhos"
  | "hidratante"
  | "firmador"
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
  { key: "tonico", label: "Tônico" },
  { key: "serum", label: "Sérum" },
  { key: "tratamento", label: "Tratamento" },
  { key: "area_olhos", label: "Área dos olhos" },
  { key: "hidratante", label: "Hidratante" },
  { key: "firmador", label: "Firmador" },
  { key: "protetor_solar", label: "Protetor solar" },
  { key: "cabelo", label: "Cabelo" },
  { key: "suplementos", label: "Suplementos" },
];

export const ROUTINE_PERIODS: Array<{ key: RoutinePeriodKey; label: string; icon: string }> = [
  { key: "manha", label: "Minha manhã", icon: "☀️" },
  { key: "noite", label: "Minha noite", icon: "🌙" },
];

// Mapeia o slug da tag "Etapa da rotina" (cadastrada em tags.type = 'routine_step')
// pro passo correspondente aqui — pra pré-selecionar o passo certo ao adicionar
// um produto já classificado à rotina. "Tratar" é ambíguo entre sérum e
// tratamento; escolhe sérum por ser a etapa mais comum de tratamento leve.
const ROUTINE_STEP_BY_TAG_SLUG: Record<string, RoutineStepKey> = {
  limpar: "limpeza",
  tonificar: "tonico",
  tratar: "serum",
  hidratar: "hidratante",
  proteger: "protetor_solar",
  firmar: "firmador",
};

export function routineStepFromTagSlug(slug: string): RoutineStepKey | null {
  return ROUTINE_STEP_BY_TAG_SLUG[slug] || null;
}

// Mapeia o slug da tag "Uso: manhã ou noite" (tags.type = 'usage_period') pro
// período correspondente aqui.
const ROUTINE_PERIOD_BY_TAG_SLUG: Record<string, RoutinePeriodKey> = {
  manha: "manha",
  noite: "noite",
};

export function routinePeriodFromTagSlug(slug: string): RoutinePeriodKey | null {
  return ROUTINE_PERIOD_BY_TAG_SLUG[slug] || null;
}

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
