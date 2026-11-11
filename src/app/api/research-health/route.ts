import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { authenticateAiRequest } from "@/lib/ai/auth";
import { recordGeneration } from "@/lib/ai/context";
import { researchHealthTopic } from "@/lib/ai/health-research";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { supabase, user } = await authenticateAiRequest(req);
    const body = await req.json();
    const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 240) : "";
    if (!topic) return NextResponse.json({ error: "Escreva o tema que você quer pesquisar primeiro." }, { status: 400 });

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const research = await researchHealthTopic(ai, topic);

    if (!research.sources.length) {
      return NextResponse.json({ error: "Não encontrei referências suficientes para começar esta pesquisa. Tente deixar o tema mais específico." }, { status: 422 });
    }

    await recordGeneration(supabase, user.id, {
      contentType: "health_research",
      topic,
      sourceCount: research.sources.length,
      usage: research.usage,
    });
    return NextResponse.json({ brief: research.brief, sources: research.sources });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não consegui pesquisar esse tema agora." }, { status: 500 });
  }
}
