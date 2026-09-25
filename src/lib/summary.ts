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

type SummaryFieldKey = "what_is" | "used_for" | "noticed" | "pro" | "caution" | "repurchase" | "duration";
export type SummaryVariant = "product" | "journal";

// Rótulos pra ficha de produto (Vitrine) — resumo de uma experiência com o item.
export const SUMMARY_FIELD_LABELS_PRODUCT: Record<SummaryFieldKey, string> = {
  what_is: "Sem rodeio, é isso",
  used_for: "Entrou pra resolver",
  noticed: "O espelho não mente",
  pro: "O que me fisgou",
  caution: "Só um alerta de amiga",
  repurchase: "Recompro ou foi um caso?",
  duration: "Tempo de casa",
};

// Mesmas 7 colunas, reinterpretadas pro contexto de um artigo de "Estudei
// para te explicar" (explica um ativo/tema, não é resenha de uso pessoal).
export const SUMMARY_FIELD_LABELS_ARTICLE: Record<SummaryFieldKey, string> = {
  what_is: "Sem rodeio, é isso",
  used_for: "Serve pra isso",
  noticed: "O que a ciência mostra",
  pro: "O que me convenceu",
  caution: "Só um alerta de amiga",
  repurchase: "Vale a pena buscar?",
  duration: "Tempo pra ver resultado",
};

export function summaryFieldLabels(variant: SummaryVariant): Record<SummaryFieldKey, string> {
  return variant === "journal" ? SUMMARY_FIELD_LABELS_ARTICLE : SUMMARY_FIELD_LABELS_PRODUCT;
}

export const SUMMARY_FIELD_KEYS = Object.keys(SUMMARY_FIELD_LABELS_PRODUCT) as SummaryFieldKey[];

const RESUMO_RAPIDO_KEY_BY_FIELD: Record<SummaryFieldKey, keyof ResumoRapido> = {
  what_is: "whatIs",
  used_for: "usedFor",
  noticed: "noticed",
  pro: "pro",
  caution: "caution",
  repurchase: "repurchase",
  duration: "duration",
};

// Mesmos rótulos, mas com as chaves em camelCase de ResumoRapido — usado no
// formulário do admin, que edita o objeto vindo/indo da IA.
export function resumoRapidoFields(variant: SummaryVariant): Array<{ key: keyof ResumoRapido; label: string }> {
  const labels = summaryFieldLabels(variant);
  return SUMMARY_FIELD_KEYS.map((field) => ({ key: RESUMO_RAPIDO_KEY_BY_FIELD[field], label: labels[field] }));
}

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
