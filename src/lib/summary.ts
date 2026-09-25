export type ResumoRapido = { whatIs: string; usedFor: string; noticed: string; pro: string; caution: string; repurchase: string; duration: string };

export const EMPTY_RESUMO_RAPIDO: ResumoRapido = { whatIs: "", usedFor: "", noticed: "", pro: "", caution: "", repurchase: "", duration: "" };

export type ContentSummary = {
  id?: string;
  content_type: "journal" | "product";
  content_id: string;
  what_is?: string | null;
  used_for?: string | null;
  noticed?: string | null;
  pro?: string | null;
  caution?: string | null;
  repurchase?: string | null;
  duration?: string | null;
  generated_by?: "manual" | "ai";
};

export const SUMMARY_FIELD_LABELS: Record<keyof Pick<ContentSummary, "what_is" | "used_for" | "noticed" | "pro" | "caution" | "repurchase" | "duration">, string> = {
  what_is: "Sem rodeio, é isso",
  used_for: "Entrou pra resolver",
  noticed: "O espelho não mente",
  pro: "O que me fisgou",
  caution: "Só um alerta de amiga",
  repurchase: "Recompro ou foi um caso?",
  duration: "Tempo de casa",
};

export const SUMMARY_FIELD_KEYS = Object.keys(SUMMARY_FIELD_LABELS) as Array<keyof typeof SUMMARY_FIELD_LABELS>;

// Mesmos rótulos, mas com as chaves em camelCase de ResumoRapido — usado no
// formulário do admin, que edita o objeto vindo/indo da IA.
export const RESUMO_RAPIDO_FIELDS: Array<{ key: keyof ResumoRapido; label: string }> = [
  { key: "whatIs", label: SUMMARY_FIELD_LABELS.what_is },
  { key: "usedFor", label: SUMMARY_FIELD_LABELS.used_for },
  { key: "noticed", label: SUMMARY_FIELD_LABELS.noticed },
  { key: "pro", label: SUMMARY_FIELD_LABELS.pro },
  { key: "caution", label: SUMMARY_FIELD_LABELS.caution },
  { key: "repurchase", label: SUMMARY_FIELD_LABELS.repurchase },
  { key: "duration", label: SUMMARY_FIELD_LABELS.duration },
];

export function hasAnySummaryContent(summary?: ContentSummary | null) {
  if (!summary) return false;
  return SUMMARY_FIELD_KEYS.some((key) => Boolean(summary[key]?.trim()));
}

export function resumoRapidoHasContent(resumo?: ResumoRapido | null) {
  if (!resumo) return false;
  return Boolean(resumo.whatIs?.trim() || resumo.usedFor?.trim() || resumo.noticed?.trim() || resumo.pro?.trim() || resumo.caution?.trim() || resumo.repurchase?.trim() || resumo.duration?.trim());
}

export function resumoRapidoToRow(resumo: ResumoRapido): Pick<ContentSummary, "what_is" | "used_for" | "noticed" | "pro" | "caution" | "repurchase" | "duration"> {
  return {
    what_is: resumo.whatIs?.trim() || null,
    used_for: resumo.usedFor?.trim() || null,
    noticed: resumo.noticed?.trim() || null,
    pro: resumo.pro?.trim() || null,
    caution: resumo.caution?.trim() || null,
    repurchase: resumo.repurchase?.trim() || null,
    duration: resumo.duration?.trim() || null,
  };
}

export function rowToResumoRapido(summary?: ContentSummary | null): ResumoRapido {
  return {
    whatIs: summary?.what_is || "",
    usedFor: summary?.used_for || "",
    noticed: summary?.noticed || "",
    pro: summary?.pro || "",
    caution: summary?.caution || "",
    repurchase: summary?.repurchase || "",
    duration: summary?.duration || "",
  };
}
