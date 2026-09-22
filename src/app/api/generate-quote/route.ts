import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { authenticateAiRequest } from "@/lib/ai/auth";
import { loadAiContext, recordGeneration } from "@/lib/ai/context";
import { LUANA_VOICE, SIMPLE_LANGUAGE_RULES, TRUTH_RULES } from "@/lib/ai/identity";
import { generateAi } from "@/lib/ai/runtime";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { supabase, user } = await authenticateAiRequest(req);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const context = await loadAiContext(supabase, user.id, "quote", ["menopausa", "maturidade", "autocuidado", "humor"]);
    const prompt = `${LUANA_VOICE}
${TRUTH_RULES}
${SIMPLE_LANGUAGE_RULES}
${context.memoryPrompt}
${context.antiRepetitionPrompt}

Crie exatamente 15 pílulas de 1 ou 2 frases. Distribua o lote: liberdade na maturidade, corpo sem guerra, menopausa sem dramatização, autocuidado possível e humor sobre a vida cotidiana. Cada frase deve ter ideia e construção próprias. Evite café, vinho, espelho, colágeno, "se priorize", "sua melhor versão", "idade é só um número" e outras frases de autoajuda genéricas. Não faça piada que diminua a mulher madura.

Retorne uma frase por linha, sem números, aspas, marcadores ou comentários.`;
    const { response, usage } = await generateAi(ai, "quote", {
      contents: prompt,
      config: { temperature: 0.95 },
    });
    const lines = (response.text || "").split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 15);
    await recordGeneration(supabase, user.id, { contentType: "quote", notablePhrases: lines.slice(0, 3), memoryIds: context.memoryIds, usage });
    return NextResponse.json({ text: lines.join("\n") });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao gerar pílulas";
    return NextResponse.json({ error: message }, { status: message.includes("autoriz") || message.includes("Sessão") ? 401 : 500 });
  }
}
