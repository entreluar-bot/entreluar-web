import { findBlockedCliches, normalizeForMatch } from "./blocklist";
import { extractOpeningSignature } from "./openings";
import type { PersonaCard } from "./personas";

export interface ValidationIssue {
  index: number;
  reasons: string[];
}

function wordTrigramSet(text: string): Set<string> {
  const words = normalizeForMatch(text).split(" ").filter(Boolean);
  if (words.length < 3) return new Set(words);
  const set = new Set<string>();
  for (let i = 0; i <= words.length - 3; i++) {
    set.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return set;
}

export function computeTextSimilarity(a: string, b: string): number {
  const setA = wordTrigramSet(a);
  const setB = wordTrigramSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function countWords(text: string): number {
  const norm = normalizeForMatch(text);
  return norm ? norm.split(" ").filter(Boolean).length : 0;
}

export function validateSingleComment(
  body: string,
  card: PersonaCard,
  context: {
    extraForbiddenPhrases: string[];
    forbiddenOpenings: Set<string>;
    acceptedBodies: string[];
  },
): string[] {
  const reasons: string[] = [];
  const trimmed = (body || "").trim();
  if (!trimmed) {
    reasons.push("Comentário vazio");
    return reasons;
  }

  const wordCount = countWords(trimmed);

  if (card.lengthTier === "so_emoji") {
    if (wordCount > 0) {
      reasons.push("Deveria conter apenas emojis, sem palavras");
    }
    return reasons;
  }

  if (wordCount === 0) {
    reasons.push("Deveria conter texto, mas veio só emoji/símbolo");
    return reasons;
  }

  // Checa tamanhos extremos fora da ficha
  if (card.lengthTier === "micro_1_3_palavras" && wordCount > 6) {
    reasons.push(`Era para ser curtíssimo (1-4 palavras), mas veio com ${wordCount} palavras`);
  } else if (card.lengthTier === "textao_4_6_frases" && wordCount < 35) {
    reasons.push(`Era para ser textão (45+ palavras), mas veio curto (${wordCount} palavras)`);
  }

  // Checa clichês proibidos e n-grams saturados
  const cliches = findBlockedCliches(trimmed, context.extraForbiddenPhrases);
  if (cliches.length > 0) {
    reasons.push(`Usou expressão batida/proibida: ${cliches.slice(0, 3).join(", ")}`);
  }

  // Proíbe "discordo" literal nas fichas de contraponto
  if (
    (card.intent === "discordancia_educada" || card.intent === "discordancia_firme") &&
    /\bdiscordo\b/i.test(normalizeForMatch(trimmed))
  ) {
    reasons.push("Usou a palavra literal 'discordo'");
  }

  // Checa abertura repetida (apenas para comentários com mais de 4 palavras)
  if (wordCount > 4) {
    const opening3 = extractOpeningSignature(trimmed, 3);
    const opening2 = extractOpeningSignature(trimmed, 2);
    if (
      (opening3 && context.forbiddenOpenings.has(opening3)) ||
      (opening2 && opening2.length >= 7 && context.forbiddenOpenings.has(opening2))
    ) {
      reasons.push(`Começou igual a outro comentário ("${opening3}")`);
    }
  }

  // Checa similaridade com comentários já aceitos ou existentes no post
  for (const prev of context.acceptedBodies) {
    if (normalizeForMatch(prev) === normalizeForMatch(trimmed)) {
      reasons.push("Texto idêntico a outro comentário");
      break;
    }
    if (wordCount >= 6 && computeTextSimilarity(trimmed, prev) > 0.42) {
      reasons.push("Estrutura muito parecida com outro comentário do post");
      break;
    }
  }

  return reasons;
}

export function validateCommentBatch(
  items: Array<{ index: number; body: string }>,
  cards: PersonaCard[],
  memory: {
    existingPostBodies: string[];
    recentOpenings: string[];
    repeatedTrigrams: string[];
  },
): {
  approved: Map<number, string>;
  rejected: ValidationIssue[];
} {
  const approved = new Map<number, string>();
  const rejected: ValidationIssue[] = [];
  const forbiddenOpenings = new Set<string>(memory.recentOpenings);
  const acceptedBodies = [...memory.existingPostBodies];

  for (const card of cards) {
    const candidate = items.find((it) => it.index === card.index);
    const rawBody = candidate?.body?.trim() || "";
    const finalBody = card.fluency === "caps_lock" ? rawBody.toUpperCase() : rawBody;

    const reasons = validateSingleComment(finalBody, card, {
      extraForbiddenPhrases: memory.repeatedTrigrams,
      forbiddenOpenings,
      acceptedBodies,
    });

    if (reasons.length === 0) {
      approved.set(card.index, finalBody);
      acceptedBodies.push(finalBody);
      const op3 = extractOpeningSignature(finalBody, 3);
      const op2 = extractOpeningSignature(finalBody, 2);
      if (op3) forbiddenOpenings.add(op3);
      if (op2 && op2.length >= 7) forbiddenOpenings.add(op2);
    } else {
      rejected.push({ index: card.index, reasons });
    }
  }

  return { approved, rejected };
}
