import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { authenticateAiRequest } from "@/lib/ai/auth";
import { parseJson, recordGeneration } from "@/lib/ai/context";
import { LUANA_VOICE, TAG_SUGGESTION_RULES, TRUTH_RULES } from "@/lib/ai/identity";
import { tagSuggestionSchema } from "@/lib/ai/schemas";
import { generateAi } from "@/lib/ai/runtime";
import { plainTextFromHtml } from "@/lib/share-metadata";
import { filterValidTagSlugs, formatTagsForPrompt, type Tag } from "@/lib/tags";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { supabase, user } = await authenticateAiRequest(req);
    const body = await req.json();
    const { contentType, title, sourceHtml } = body as { contentType?: "journal" | "product"; title?: string; sourceHtml?: string };

    const sourceText = plainTextFromHtml(sourceHtml, 4000);
    if (!sourceText) return NextResponse.json({ error: "Não há texto publicado para sugerir tags." }, { status: 400 });

    const { data: tagRows } = await supabase.from("tags").select("id,name,slug,type");
    const tags = (tagRows || []) as Tag[];
    if (!tags.length) return NextResponse.json({ suggestedTagSlugs: [] });

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const kind = contentType === "journal" ? "artigo de \"Estudei para te explicar\"" : "produto da Vitrine";
    const prompt = `${LUANA_VOICE}\n${TRUTH_RULES}\n${TAG_SUGGESTION_RULES}

Este é um ${kind} JÁ PUBLICADO da Luana. Título: "${title || "sem título"}".
TEXTO JÁ PUBLICADO:
"""${sourceText}"""

TAGS DISPONÍVEIS:
${formatTagsForPrompt(tags)}

Preencha suggestedTagSlugs só com slugs dessa lista.`;

    const { response, usage } = await generateAi(ai, "tags", {
      contents: prompt,
      config: { responseMimeType: "application/json", responseJsonSchema: tagSuggestionSchema, temperature: 0.3 },
    });

    const parsed = parseJson<{ suggestedTagSlugs: string[] }>(response.text);
    const suggestedTagSlugs = filterValidTagSlugs(parsed?.suggestedTagSlugs, tags);
    await recordGeneration(supabase, user.id, { contentType: "tags", topic: title, usage });
    return NextResponse.json({ suggestedTagSlugs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao sugerir tags";
    return NextResponse.json({ error: message }, { status: message.includes("autoriz") || message.includes("Sessão") ? 401 : 500 });
  }
}
