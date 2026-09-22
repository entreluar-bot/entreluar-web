import { expect, test } from "@playwright/test";
import { friendlyAiError, type QuoteCandidate, validateAccessoryTrace, validateQuoteBatch } from "../src/lib/ai/copy-quality";
import { buildAccessoryPrompt, buildQuotePrompt } from "../src/lib/ai/prompts";
import { getAiPolicy } from "../src/lib/ai/runtime";

const themes = ["humor_cotidiano", "liberdade", "corpo", "menopausa", "motivacao"] as const;

function validQuoteBatch(): QuoteCandidate[] {
  return themes.flatMap((theme, themeIndex) => Array.from({ length: 3 }, (_, index) => ({
    theme,
    text: `Frase original ${themeIndex + 1}-${index + 1}: maturidade também é escolher a própria direção com leveza e coragem.`,
  })));
}

test("modelo antigo de pílulas é substituído pelo modelo estável", () => {
  const previous = process.env.AI_MODEL_QUOTE;
  process.env.AI_MODEL_QUOTE = "models/gemini-2.5-flash-lite";
  expect(getAiPolicy("quote").model).toBe("gemini-3.5-flash-lite");
  if (previous === undefined) delete process.env.AI_MODEL_QUOTE;
  else process.env.AI_MODEL_QUOTE = previous;
});

test("lote válido contém 15 frases sem cotas temáticas", () => {
  expect(validateQuoteBatch(validQuoteBatch(), []).valid).toBe(true);
  expect(validateQuoteBatch(validQuoteBatch().map(({ text }) => ({ text })), []).valid).toBe(true);
});

test("prompt recupera motivação e deboche sem bloquear café ou colágeno", () => {
  const prompt = buildQuotePrompt({ existingQuotes: [] });
  expect(prompt).toContain("acolhedoras ou debochadas");
  expect(prompt).toContain("se sentir poderosa");
  expect(prompt).not.toContain("PROIBIDO");
  const candidates = validQuoteBatch();
  candidates[0].text = "Meu café está forte, meu colágeno nem tanto, mas minha vontade de viver continua de pé.";
  expect(validateQuoteBatch(candidates, []).valid).toBe(true);
});

test("lote rejeita clichês, repetições e frases publicadas", () => {
  const candidates = validQuoteBatch();
  candidates[0].text = "A idade é só um número.";
  candidates[1].text = candidates[2].text;
  const quality = validateQuoteBatch(candidates, [candidates[3].text]);
  expect(quality.valid).toBe(false);
  expect(quality.errors.join(" ")).toContain("Clichê");
  expect(quality.errors.join(" ")).toContain("repetidas");
  expect(quality.errors.join(" ")).toContain("publicada");
});

test("prompt de acessório exige notas reais e humor elegante", () => {
  const prompt = buildAccessoryPrompt({
    title: "Bolsa vinho com alça dourada",
    link: "https://example.com",
    impressions: "Cabe meu celular, meus óculos e o batom. Usei em um jantar e a alça não enroscou no cabelo.",
    experienceStatus: "testado",
    testDuration: "duas semanas",
    memoryPrompt: "Sem memória adicional.",
    antiRepetitionPrompt: "Evite repetir aberturas.",
  });
  expect(prompt).toContain("Use obrigatoriamente ao menos um detalhe concreto");
  expect(prompt).toContain("Humor é uma piscadinha");
  expect(prompt).toContain("alça não enroscou no cabelo");
  const promptWithoutNotes = buildAccessoryPrompt({
    title: "Lenço estampado",
    experienceStatus: "nao_informado",
    memoryPrompt: "Sem memória adicional.",
    antiRepetitionPrompt: "Evite repetir aberturas.",
  });
  expect(promptWithoutNotes).toContain("não invente experiência");
  expect(promptWithoutNotes).toContain("inputDetailsUsed deve ser um array vazio");
});

test("rastreabilidade de acessório confirma detalhe das notas", () => {
  const notes = "Cabe meu celular, meus óculos e o batom. A alça não enroscou no cabelo.";
  expect(validateAccessoryTrace(notes, ["A alça não enroscou no cabelo"], true, "Texto com humor leve.").valid).toBe(true);
  expect(validateAccessoryTrace(notes, ["O couro é muito durável"], true, "Texto.").valid).toBe(false);
  expect(validateAccessoryTrace(notes, ["A alça não enroscou no cabelo"], true, "Um alívio para quem, como eu, já passou tempo demais lutando com acessórios.").valid).toBe(false);
  expect(validateAccessoryTrace("", [], true, "Um lenço para quem não sabe o que fazer com o pescoço depois dos cinquenta.").valid).toBe(false);
  expect(validateAccessoryTrace("", [], true, "Texto baseado apenas no que aparece na foto.").valid).toBe(true);
});

test("erros técnicos viram mensagens compreensíveis", () => {
  expect(friendlyAiError(new Error("404 NOT_FOUND model/models/gemini-2.5-flash-lite"))).toContain("modelo de inspiração");
  expect(friendlyAiError(new Error("Request timed out"))).toContain("demorou");
  expect(friendlyAiError(new Error("Invalid JSON"))).toContain("incompletas");
});
