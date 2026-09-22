import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { authenticateAiRequest } from "@/lib/ai/auth";
import { loadAiContext, parseJson, recordGeneration } from "@/lib/ai/context";
import { friendlyAiError, type QuoteCandidate, validateQuoteBatch } from "@/lib/ai/copy-quality";
import { buildQuotePrompt } from "@/lib/ai/prompts";
import { generateAi } from "@/lib/ai/runtime";
import { quoteBatchSchema } from "@/lib/ai/schemas";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { supabase, user } = await authenticateAiRequest(req);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const [{ data: existingRows }, context] = await Promise.all([
      supabase.from("quotes").select("quote").order("created_at", { ascending: false }).limit(80),
      loadAiContext(supabase, user.id, "quote", ["menopausa", "maturidade", "autocuidado", "humor"]),
    ]);
    const existingQuotes = (existingRows || []).map((row) => String(row.quote || "")).filter(Boolean);

    let retryFeedback: string[] | undefined;
    let candidates: QuoteCandidate[] = [];
    let usage;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { response, usage: currentUsage } = await generateAi(ai, "quote", {
        contents: buildQuotePrompt({
          memoryPrompt: context.memoryPrompt,
          antiRepetitionPrompt: context.antiRepetitionPrompt,
          existingQuotes,
          retryFeedback,
        }),
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: quoteBatchSchema,
          temperature: attempt === 0 ? 0.9 : 0.65,
        },
      });
      usage = currentUsage;
      const parsed = parseJson<{ items: QuoteCandidate[] }>(response.text);
      candidates = parsed.items || [];
      const quality = validateQuoteBatch(candidates, existingQuotes);
      if (quality.valid) break;
      retryFeedback = quality.errors;
    }

    const quality = validateQuoteBatch(candidates, existingQuotes);
    if (!quality.valid) throw new Error(`A resposta da IA veio incompleta: ${quality.errors.join(" ")}`);

    const quotes = candidates.map((candidate) => candidate.text.trim());
    await recordGeneration(supabase, user.id, {
      contentType: "quote",
      notablePhrases: quotes.slice(0, 3),
      memoryIds: context.memoryIds,
      usage,
      retryCount: retryFeedback ? 1 : 0,
    });
    return NextResponse.json({ text: quotes.join("\n"), quotes });
  } catch (error: unknown) {
    const raw = error instanceof Error ? error.message : "";
    const status = raw.includes("autoriz") || raw.includes("Sessão") ? 401 : 500;
    return NextResponse.json({ error: status === 401 ? raw : friendlyAiError(error) }, { status });
  }
}
