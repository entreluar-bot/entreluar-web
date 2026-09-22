import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { type QuoteCandidate, validateAccessoryTrace, validateQuoteBatch } from "../src/lib/ai/copy-quality";
import { buildAccessoryPrompt, buildQuotePrompt } from "../src/lib/ai/prompts";
import { accessorySchema, quoteBatchSchema } from "../src/lib/ai/schemas";

const shouldRun = process.env.RUN_AI_LIVE === "true";

function localEnv() {
  return Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator), line.slice(separator + 1)];
  }));
}

test("Gemini gera lote real de 15 pílulas aprovadas", async () => {
  test.skip(!shouldRun, "Teste ao vivo executado somente na entrega.");
  const env = localEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data } = await supabase.from("quotes").select("quote").order("created_at", { ascending: false }).limit(80);
  const existingQuotes = (data || []).map((row) => String(row.quote || ""));
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  let candidates: QuoteCandidate[] = [];
  let retryFeedback: string[] | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: buildQuotePrompt({
        memoryPrompt: "Não invente fatos pessoais.",
        antiRepetitionPrompt: "Varie aberturas, imagens e conclusões.",
        existingQuotes,
        retryFeedback,
      }),
      config: { responseMimeType: "application/json", responseJsonSchema: quoteBatchSchema, temperature: attempt === 0 ? 0.9 : 0.65, maxOutputTokens: 1_400 },
    });
    candidates = (JSON.parse(response.text || "{}").items || []) as QuoteCandidate[];
    const quality = validateQuoteBatch(candidates, existingQuotes);
    if (quality.valid) break;
    retryFeedback = quality.errors;
  }
  expect(validateQuoteBatch(candidates, existingQuotes)).toEqual({ valid: true, errors: [] });
  console.log("PILL_REVIEW_BATCH=" + JSON.stringify(candidates.map((candidate) => candidate.text)));
});

test("Gemini usa notas e humor elegante em acessório real", async () => {
  test.skip(!shouldRun, "Teste ao vivo executado somente na entrega.");
  const env = localEnv();
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const notes = "Cabe meu celular, meus óculos e o batom. Usei em um jantar e a alça não enroscou no cabelo.";
  let generated = { productReview: "", inputDetailsUsed: [] as string[], humorApplied: false };
  let retryFeedback: string[] | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: buildAccessoryPrompt({
        title: "Bolsa vinho com alça dourada",
        link: "https://example.com/bolsa",
        impressions: notes,
        experienceStatus: "testado",
        testDuration: "duas semanas",
        memoryPrompt: "Não invente fatos pessoais.",
        antiRepetitionPrompt: "Evite aberturas publicitárias.",
        retryFeedback,
      }),
      config: { responseMimeType: "application/json", responseJsonSchema: accessorySchema, temperature: attempt === 0 ? 0.8 : 0.55, maxOutputTokens: 900 },
    });
    generated = JSON.parse(response.text || "{}") as typeof generated;
    const quality = validateAccessoryTrace(notes, generated.inputDetailsUsed, generated.humorApplied, generated.productReview);
    if (quality.valid) break;
    retryFeedback = quality.errors;
  }
  expect(validateAccessoryTrace(notes, generated.inputDetailsUsed, generated.humorApplied, generated.productReview)).toEqual({ valid: true, errors: [] });
  console.log("ACCESSORY_REVIEW=" + JSON.stringify(generated));
});

test("Gemini não inventa vivência quando o acessório não tem notas", async () => {
  test.skip(!shouldRun, "Teste ao vivo executado somente na entrega.");
  const env = localEnv();
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  let generated = { productReview: "", inputDetailsUsed: [] as string[], humorApplied: false };
  let retryFeedback: string[] | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: buildAccessoryPrompt({
        title: "Lenço estampado em tons de vinho e dourado",
        link: "https://example.com/lenco",
        experienceStatus: "nao_informado",
        memoryPrompt: "Não invente fatos pessoais.",
        antiRepetitionPrompt: "Evite aberturas publicitárias.",
        retryFeedback,
      }),
      config: { responseMimeType: "application/json", responseJsonSchema: accessorySchema, temperature: attempt === 0 ? 0.7 : 0.5, maxOutputTokens: 900 },
    });
    generated = JSON.parse(response.text || "{}") as typeof generated;
    const quality = validateAccessoryTrace("", generated.inputDetailsUsed, generated.humorApplied, generated.productReview);
    if (quality.valid) break;
    retryFeedback = quality.errors;
  }
  expect(validateAccessoryTrace("", generated.inputDetailsUsed, generated.humorApplied, generated.productReview)).toEqual({ valid: true, errors: [] });
  expect(generated.inputDetailsUsed).toEqual([]);
  console.log("ACCESSORY_WITHOUT_NOTES=" + JSON.stringify(generated));
});
