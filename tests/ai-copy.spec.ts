import { expect, test } from "@playwright/test";
import { friendlyAiError, type QuoteCandidate, validateAccessoryTrace, validateQuoteBatch, validateReviewCopy } from "../src/lib/ai/copy-quality";
import { PAPO_DE_MULHER_VOICE_RULES, PRODUCT_REVIEW_STYLE_RULES, SCIENCE_RULES, SIMPLE_LANGUAGE_RULES } from "../src/lib/ai/identity";
import { buildAccessoryPrompt, buildQuotePrompt } from "../src/lib/ai/prompts";
import { getEditorialDirection, getProductCreativeDirection, originalityRules } from "../src/lib/creative-direction";
import { getAiPolicy } from "../src/lib/ai/runtime";
import { findBlockedCliches } from "../src/lib/social-proof/blocklist";
import { drawPersonaBatch } from "../src/lib/social-proof/personas";
import { validateCommentBatch } from "../src/lib/social-proof/validate";
import { clampCommentDisplayDate, generateSafeCommentDate, isFuturePostDate } from "../src/lib/social-proof/timing";
import { buildSocialProofPrompt } from "../src/lib/social-proof/prompt";
import { buildMemoryFromTexts } from "../src/lib/social-proof/memory";

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

test("prompt recupera humor e autonomia sem molde de café obrigatório", () => {
  const prompt = buildQuotePrompt({ existingQuotes: [] });
  expect(prompt).toContain("autonomia");
  expect(prompt).toContain("bem humoradas");
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

test("regras de resenha priorizam conversa simples e uso prático", () => {
  expect(SIMPLE_LANGUAGE_RULES).toContain("energia positiva");
  expect(SIMPLE_LANGUAGE_RULES).toContain("trocando experiência com uma amiga");
  expect(PRODUCT_REVIEW_STYLE_RULES).toContain("benefícios do produto");
  expect(PRODUCT_REVIEW_STYLE_RULES).toContain("textura");
  expect(PRODUCT_REVIEW_STYLE_RULES).toContain("quantidade");
  expect(PRODUCT_REVIEW_STYLE_RULES).toContain("movimentos de aplicação");
  expect(PRODUCT_REVIEW_STYLE_RULES).toContain("frequência diária ou intervalada");
  expect(PRODUCT_REVIEW_STYLE_RULES).toContain("cuidado com sol");
  expect(PRODUCT_REVIEW_STYLE_RULES).toContain("Varie a arquitetura");
  expect(PRODUCT_REVIEW_STYLE_RULES).toContain("títulos devem variar");
  expect(SCIENCE_RULES).toContain("não substitui procedimentos estéticos");
});

test("crônicas recebem uma voz íntima de alter ego, não um texto de bem-estar genérico", () => {
  expect(PAPO_DE_MULHER_VOICE_RULES).toContain("alter ego literário da Luana");
  expect(PAPO_DE_MULHER_VOICE_RULES).toContain("áudio longo para uma amiga esperta");
  expect(PAPO_DE_MULHER_VOICE_RULES).toContain("ponto de vista");
  expect(PAPO_DE_MULHER_VOICE_RULES).toContain("frase de caneca");
  expect(PAPO_DE_MULHER_VOICE_RULES).toContain("Não invente fatos, cenas, falas");
});

test("resenha bloqueia disclaimers genéricos sobre procedimentos", () => {
  expect(validateReviewCopy("Esse creme hidrata bem, mas não substitui procedimentos estéticos.").valid).toBe(false);
  expect(validateReviewCopy("Vale usar com calma e procurar um dermatologista.").valid).toBe(false);
  expect(validateReviewCopy("Eu aplicaria uma ervilha, em movimentos circulares, e capricharia no protetor de manhã.").valid).toBe(true);
});

test("direção criativa de produto força variedade editorial", () => {
  const direction = getProductCreativeDirection();
  expect(direction).toContain("Ângulo:");
  expect(direction).toContain("Abertura:");
  expect(direction).toContain("Humor:");
  expect(originalityRules).toContain("mágica dos ativos");
});

test("direção editorial respeita o material disponível", () => {
  const researchOnly = getEditorialDirection({ hasResearch: true, hasPersonalNotes: false, hasOfficialProductInfo: false });
  expect(researchOnly).toContain("Sem confirmação, não invente");
  expect(researchOnly).not.toContain("confissão breve sustentada pelas notas pessoais");

  const withNotes = getEditorialDirection({ hasResearch: true, hasPersonalNotes: true, hasOfficialProductInfo: true });
  expect(withNotes).toContain("não copie estruturas recentes");
});

test("copy bloqueia experiência e sensorial sem confirmação", () => {
  const quality = validateReviewCopy("Eu usei e na minha pele a textura leve absorveu rapidinho.", {
    evidenceText: "retinal renovação",
    sensoryEvidenceText: "",
    enforceEditorialDiversity: true,
  });
  expect(quality.valid).toBe(false);
  expect(quality.errors.join(" ")).toContain("experiência pessoal");
  expect(quality.errors.join(" ")).toContain("sensorial");

  expect(validateReviewCopy("Ao estudar o retinal, encontrei uma função ligada à renovação da pele.", {
    evidenceText: "retinal renovação da pele",
    enforceEditorialDiversity: true,
  }).valid).toBe(true);
});

test("pílulas recebem direção autoral sem fórmula de café obrigatório", () => {
  const prompt = buildQuotePrompt({ existingQuotes: [] });
  expect(prompt).toContain("autonomia");
  expect(prompt).toContain("experiência e a autonomia");
  expect(prompt).not.toContain("tomando um café");
});

test("resenha editorial rejeita clichês, abertura genérica e falta de dado concreto", () => {
  const generic = validateReviewCopy("Amiga, esse produto é um segredinho. A pele madura agradece.", {
    evidenceText: "retinal peptideos hidratação",
    enforceEditorialDiversity: true,
  });
  expect(generic.valid).toBe(false);
  expect(generic.errors.join(" ")).toContain("Muleta editorial");
  expect(generic.errors.join(" ")).toContain("Abertura genérica");
  expect(generic.errors.join(" ")).toContain("dado concreto");

  const concrete = validateReviewCopy("O retinal entra aqui como aquele ativo de renovação que pede noite, calma e protetor no dia seguinte.", {
    evidenceText: "retinal renovação uso noturno",
    enforceEditorialDiversity: true,
  });
  expect(concrete.valid).toBe(true);
});

test("Estudei rejeita o molde antigo de headings fixos", () => {
  const oldTemplate = `
    <h3>📣 A Promessa da Indústria</h3>
    <h3>🧴 Afinal, o que tem na fórmula?</h3>
    <h3>🔬 O que a ciência diz sobre esses ativos?</h3>
    <h3>✨ E a nossa pele madura, ganha o quê com isso?</h3>
    <h3>🪞 Manual de Sobrevivência</h3>
  `;
  const quality = validateReviewCopy(oldTemplate, { isEstudei: true });
  expect(quality.valid).toBe(false);
  expect(quality.errors.join(" ")).toContain("molde antigo");
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

test("prova social: blocklist detecta clichês como 'eu toda' e 'mto real' e prompt não entrega frases copiáveis", () => {
  expect(findBlockedCliches("Menina, eu toda nessa fase!")).toContain("eu toda");
  expect(findBlockedCliches("nossa isso eh mto real amiga")).toContain("mto real");
  expect(findBlockedCliches("Passei calor ontem na fila do mercado e lembrei disso.")).toEqual([]);

  const cards = drawPersonaBatch(5, "O calor da menopausa chega sem avisar no meio da noite. Dormir de janela aberta virou regra.");
  expect(cards).toHaveLength(5);
  // Todas as aberturas do lote devem ser distintas
  const uniqueOpenings = new Set(cards.map((c) => c.opening.id));
  expect(uniqueOpenings.size).toBe(5);

  const memory = buildMemoryFromTexts([{ body: "Acordei às três da manhã suando frio", reader_name: "Vera" }], []);
  const prompt = buildSocialProofPrompt({
    title: "Calor da madrugada",
    category: "Papo de Mulher",
    sourceText: "O calor da menopausa chega sem avisar.",
    cards,
    memory,
  });
  expect(prompt).toContain("COMENTÁRIO #1");
  expect(prompt).toContain("PROIBIDO usar");
});

test("prova social: validador reprova clichês e aberturas repetidas e aprova comentários autênticos", () => {
  const cards = drawPersonaBatch(3, "Cuidar da pele depois dos cinquenta pede paciência e poucos produtos bons.");
  cards[0].lengthTier = "curto_1_frase";
  cards[0].fluency = "informal_correta";
  cards[1].lengthTier = "curto_1_frase";
  cards[1].fluency = "internetes";
  cards[2].lengthTier = "curto_1_frase";
  cards[2].fluency = "informal_correta";

  const { approved, rejected } = validateCommentBatch(
    [
      { index: 1, body: "Lá em casa meu marido já sabe que o ventilador é só meu." },
      { index: 2, body: "Nossa isso eh mto real, eu toda!" },
      { index: 3, body: "Lá em casa meu cachorro tambem dorme perto do ventilador." },
    ],
    cards,
    { existingPostBodies: [], recentOpenings: [], repeatedTrigrams: [] },
  );

  expect(approved.has(1)).toBe(true);
  expect(approved.has(2)).toBe(false);
  expect(approved.has(3)).toBe(false); // mesma abertura "la em casa"
  expect(rejected.length).toBe(2);
});

test("prova social: datas geradas ficam sempre depois do post e nunca no futuro", () => {
  const now = new Date("2026-10-16T10:00:00.000Z");
  const postDate = "2026-10-10T12:00:00.000Z";

  expect(isFuturePostDate("2026-10-20T12:00:00.000Z", now)).toBe(true);
  expect(isFuturePostDate(postDate, now)).toBe(false);

  for (let i = 0; i < 30; i++) {
    const generated = generateSafeCommentDate(postDate, "desabafo_pessoal", now);
    expect(new Date(generated).getTime()).toBeGreaterThan(new Date(postDate).getTime());
    expect(new Date(generated).getTime()).toBeLessThanOrEqual(now.getTime());
  }

  expect(clampCommentDisplayDate("2024-01-01T00:00:00.000Z", postDate)).toBe(postDate);
  expect(clampCommentDisplayDate("2026-10-12T00:00:00.000Z", postDate)).toBe("2026-10-12T00:00:00.000Z");
});

