import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { authenticateAiRequest } from "@/lib/ai/auth";
import { parseJson, recordGeneration } from "@/lib/ai/context";
import { LUANA_VOICE, QUICK_SUMMARY_RULES, SIMPLE_LANGUAGE_RULES, TRUTH_RULES } from "@/lib/ai/identity";
import { resumoRapidoSchema } from "@/lib/ai/schemas";
import { generateAi } from "@/lib/ai/runtime";
import { plainTextFromHtml } from "@/lib/share-metadata";
import { EMPTY_RESUMO_RAPIDO, type ResumoRapido } from "@/lib/summary";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { supabase, user } = await authenticateAiRequest(req);
    const body = await req.json();
    const { contentType, title, sourceHtml } = body as { contentType?: "journal" | "product"; title?: string; sourceHtml?: string };

    const sourceText = plainTextFromHtml(sourceHtml, 4000);
    if (!sourceText) return NextResponse.json({ error: "Não há texto publicado para resumir." }, { status: 400 });

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const kind = contentType === "journal" ? "artigo de \"Estudei para te explicar\"" : "produto da Vitrine";
    const prompt = `${LUANA_VOICE}\n${TRUTH_RULES}\n${SIMPLE_LANGUAGE_RULES}\n${QUICK_SUMMARY_RULES}

Este é um ${kind} JÁ PUBLICADO da Luana. Título: "${title || "sem título"}".
TEXTO JÁ PUBLICADO (única fonte permitida, não pesquise nem acrescente nada de fora dele):
"""${sourceText}"""

Preencha resumoRapido resumindo só o que está no texto acima.`;

    const { response, usage } = await generateAi(ai, "summary", {
      contents: prompt,
      config: { responseMimeType: "application/json", responseJsonSchema: resumoRapidoSchema, temperature: 0.4 },
    });

    const resumoRapido = parseJson<ResumoRapido>(response.text) || EMPTY_RESUMO_RAPIDO;
    await recordGeneration(supabase, user.id, { contentType: "summary", topic: title, usage });
    return NextResponse.json({ resumoRapido });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao gerar resumo";
    return NextResponse.json({ error: message }, { status: message.includes("autoriz") || message.includes("Sessão") ? 401 : 500 });
  }
}
