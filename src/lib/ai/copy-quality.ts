export type QuoteTheme = "humor_cotidiano" | "liberdade" | "corpo" | "menopausa" | "motivacao";

export type QuoteCandidate = {
  text: string;
  theme: QuoteTheme;
};

const REQUIRED_THEMES: Record<QuoteTheme, number> = {
  humor_cotidiano: 3,
  liberdade: 3,
  corpo: 3,
  menopausa: 3,
  motivacao: 3,
};

const BANNED_QUOTE_PATTERNS = [
  /\bcaf[eé]\b/i,
  /\bvinho\b|\btaça\b/i,
  /\bcol[aá]geno\b/i,
  /\bespelho\b/i,
  /melhor vers[aã]o/i,
  /idade [eé] s[oó] um n[uú]mero/i,
  /se priorize/i,
  /\bcoroa\b/i,
  /\banti-?idade\b/i,
  /construir a vida que/i,
  /agrega valor/i,
  /investir no pr[oó]prio/i,
  /retorno mais s[oó]lido/i,
  /corpo carrega a hist[oó]ria/i,
  /ritual de carinho/i,
];

const UNSUPPORTED_PERSONAL_PATTERNS = [
  /\bj[aá] passei\b/i,
  /\bme salvou\b/i,
  /\bvivia\b/i,
  /\bsempre sofri\b/i,
  /\btempo demais\b/i,
  /\bnaquele dia\b/i,
  /\bcomo eu\b/i,
];

const AGE_DEPRECATING_PATTERNS = [
  /depois dos (cinquenta|50)/i,
  /na nossa idade/i,
  /para a sua idade/i,
  /j[aá] n[aã]o (sabemos|podemos|conseguimos)/i,
  /velha demais/i,
];

const STOP_WORDS = new Set(["aquela", "aquele", "assim", "ainda", "comigo", "como", "dessa", "desse", "entre", "essa", "esse", "mais", "menos", "mesma", "mesmo", "minha", "muito", "nossa", "para", "pela", "pelas", "pelo", "pelos", "porque", "quando", "quem", "sobre", "tambem", "toda", "todo", "voce"]);

export function normalizeCopy(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function meaningfulWords(value: string) {
  return new Set(normalizeCopy(value).split(" ").filter((word) => word.length >= 5 && !STOP_WORDS.has(word)));
}

function similarity(left: string, right: string) {
  const a = meaningfulWords(left);
  const b = meaningfulWords(right);
  if (!a.size || !b.size) return 0;
  const shared = [...a].filter((word) => b.has(word)).length;
  return shared / Math.min(a.size, b.size);
}

export function validateQuoteBatch(candidates: QuoteCandidate[], existingQuotes: string[]) {
  const errors: string[] = [];
  if (candidates.length !== 15) errors.push(`O lote trouxe ${candidates.length} frases; são necessárias exatamente 15.`);

  const normalized = candidates.map((candidate) => normalizeCopy(candidate.text));
  if (new Set(normalized).size !== normalized.length) errors.push("Há frases repetidas dentro do lote.");

  for (const candidate of candidates) {
    const text = candidate.text.trim();
    if (text.length < 28 || text.length > 220) errors.push(`Tamanho inadequado: "${text.slice(0, 55)}".`);
    if (BANNED_QUOTE_PATTERNS.some((pattern) => pattern.test(text))) errors.push(`Clichê ou tema bloqueado: "${text.slice(0, 55)}".`);
    if (existingQuotes.some((existing) => normalizeCopy(existing) === normalizeCopy(text) || similarity(existing, text) >= 0.78)) {
      errors.push(`Muito parecida com uma pílula publicada: "${text.slice(0, 55)}".`);
    }
  }

  for (const [theme, expected] of Object.entries(REQUIRED_THEMES) as Array<[QuoteTheme, number]>) {
    const actual = candidates.filter((candidate) => candidate.theme === theme).length;
    if (actual !== expected) errors.push(`O tema ${theme} trouxe ${actual} frases; precisa trazer ${expected}.`);
  }

  return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
}

export function validateAccessoryTrace(notes: string, detailsUsed: string[], humorApplied: boolean, review: string) {
  const errors: string[] = [];
  if (!review.trim()) errors.push("O texto da Vitrine ficou vazio.");
  if (!humorApplied) errors.push("Faltou a observação de humor elegante.");
  if (AGE_DEPRECATING_PATTERNS.some((pattern) => pattern.test(review))) {
    errors.push("O humor diminuiu a mulher por causa da idade.");
  }
  for (const pattern of UNSUPPORTED_PERSONAL_PATTERNS) {
    const claimedInReview = review.match(pattern)?.[0];
    if (claimedInReview && !normalizeCopy(notes).includes(normalizeCopy(claimedInReview))) {
      errors.push(`O texto inventou uma vivência pessoal: "${claimedInReview}".`);
    }
  }

  const notesWords = meaningfulWords(notes);
  if (notes.trim()) {
    if (!detailsUsed.length) {
      errors.push("As notas pessoais não foram aproveitadas.");
    } else {
      const traceable = detailsUsed.some((detail) => [...meaningfulWords(detail)].some((word) => notesWords.has(word)));
      if (!traceable) errors.push("Os detalhes declarados não correspondem às notas pessoais.");
    }
  } else if (detailsUsed.length) {
    errors.push("Foram declarados detalhes pessoais sem notas fornecidas.");
  }

  return { valid: errors.length === 0, errors };
}

export function friendlyAiError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || "");
  const message = raw.toLowerCase();
  if (message.includes("404") || message.includes("not_found") || message.includes("model/")) {
    return "O modelo de inspiração foi atualizado e não respondeu como esperado. Tente novamente em instantes.";
  }
  if (message.includes("timeout") || message.includes("timed out") || message.includes("fetch failed")) {
    return "A inspiração demorou mais do que o combinado. Tente novamente em instantes.";
  }
  if (message.includes("incompleta") || message.includes("json") || message.includes("formata")) {
    return "As frases vieram incompletas. Tente gerar um novo lote.";
  }
  return "Não consegui concluir a geração agora. Tente novamente em instantes.";
}
