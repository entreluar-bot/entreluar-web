import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { authenticateAiRequest } from "@/lib/ai/auth";
import { extractGroundingSources } from "@/lib/ai/grounding";
import { parseJson, recordGeneration } from "@/lib/ai/context";
import { generateAi } from "@/lib/ai/runtime";
import { SCIENCE_RULES, TRUTH_RULES } from "@/lib/ai/identity";

export const maxDuration = 60;

const HEALTH_DOMAINS = /(who\.int|gov\.br|acog\.org|menopause\.org|nice\.org\.uk|cochranelibrary\.com|pubmed\.ncbi\.nlm\.nih\.gov|nih\.gov|febrasgo\.org\.br|sbem\.org\.br|endocrine\.org|mayoclinic\.org|nhs\.uk)/i;

const researchSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    keyPoints: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
  },
  required: ["summary", "keyPoints"],
  additionalProperties: false,
};

export async function POST(req: Request) {
  try {
    const { supabase, user } = await authenticateAiRequest(req);
    const body = await req.json();
    const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 240) : "";
    if (!topic) return NextResponse.json({ error: "Escreva o tema que você quer pesquisar primeiro." }, { status: 400 });

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const prompt = `${TRUTH_RULES}\n${SCIENCE_RULES}

Pesquise o tema de saúde feminina madura: "${topic}".
Busque apenas informação atual em fontes confiáveis: OMS, Ministério da Saúde/Anvisa, Febrasgo, ACOG, NAMS, NICE, Cochrane, sociedades médicas, NIH ou PubMed. Priorize diretrizes e revisões. Não pesquise produtos nem marcas.

Organize um BRIEF factual para outra IA escrever uma crônica pesquisada da Luana: explique mecanismo ou contexto, sintomas quando relevantes, opções de cuidado ou tratamento que podem ser discutidas em consulta, limites da evidência e alertas específicos. Não prescreva doses, hormônios, medicamentos ou suplementos. Não escreva o artigo final e não invente fontes.`;
    const { response, usage } = await generateAi(ai, "research", {
      contents: prompt,
      config: { responseMimeType: "application/json", responseJsonSchema: researchSchema, tools: [{ googleSearch: {} }] },
    });
    const research = parseJson<{ summary: string; keyPoints: string[] }>(response.text);
    const sources = extractGroundingSources(response)
      .filter((source) => HEALTH_DOMAINS.test(source.url))
      .slice(0, 6)
      .map((source) => ({ ...source, sourceType: "Fonte científica / órgão de saúde" }));

    if (sources.length < 2) {
      return NextResponse.json({ error: "Encontrei poucas referências confiáveis para esse tema. Tente especificar o assunto ou adicione duas fontes no campo de referências." }, { status: 422 });
    }

    await recordGeneration(supabase, user.id, {
      contentType: "health_research",
      topic,
      notablePhrases: research.keyPoints.slice(0, 3),
      sourceCount: sources.length,
      usage,
    });
    return NextResponse.json({ brief: `${research.summary}\n\nPontos para conferir:\n${research.keyPoints.map((point) => `• ${point}`).join("\n")}`, sources });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não consegui pesquisar esse tema agora." }, { status: 500 });
  }
}
