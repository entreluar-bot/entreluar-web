import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { authenticateAiRequest } from "@/lib/ai/auth";
import { extractGroundingSources } from "@/lib/ai/grounding";
import { parseJson, recordGeneration } from "@/lib/ai/context";
import { generateAi } from "@/lib/ai/runtime";
import { SCIENCE_RULES, TRUTH_RULES } from "@/lib/ai/identity";

export const maxDuration = 60;

const FOUNDATION_DOMAINS = /(who\.int|gov\.br|anvisa\.gov\.br|acog\.org|menopause\.org|nice\.org\.uk|cochranelibrary\.com|pubmed\.ncbi\.nlm\.nih\.gov|nih\.gov|febrasgo\.org\.br|sbem\.org\.br|endocrine\.org|jamanetwork\.com|bmj\.com|thelancet\.com)/i;
const CLINICAL_DOMAINS = /(nhs\.uk|mayoclinic\.org|clevelandclinic\.org|hopkinsmedicine\.org|msdmanuals\.com|health\.harvard\.edu)/i;
const LOW_TRUST_DOMAINS = /(instagram\.com|tiktok\.com|youtube\.com|reddit\.com|pinterest\.|facebook\.com|amazon\.|shopee\.|mercadolivre\.|blogspot\.|wordpress\.)/i;

function classifySource(url: string) {
  if (FOUNDATION_DOMAINS.test(url)) {
    return /pubmed|jamanetwork|bmj|thelancet|cochrane/i.test(url) ? "Revisão ou estudo científico" : "Base científica: diretriz ou órgão de saúde";
  }
  if (CLINICAL_DOMAINS.test(url)) return "Explicação clínica complementar";
  return "Fonte complementar a revisar";
}

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
Escolha fontes com papéis claros, sem depender de uma lista fechada: procure pelo menos uma base forte (órgão de saúde, diretriz profissional, revisão sistemática ou estudo indexado) e, quando ajudar a traduzir o assunto, uma explicação clínica de hospital ou instituição reconhecida. Exemplos frequentes são OMS, Ministério da Saúde/Anvisa, FEBRASGO, ACOG, NAMS, NICE, Cochrane, sociedades médicas, NIH e PubMed. Não pesquise produtos, marcas, lojas, influenciadoras ou blogs comerciais.

Organize um BRIEF factual para outra IA escrever uma crônica pesquisada da Luana: explique mecanismo ou contexto, sintomas quando relevantes, opções de cuidado ou tratamento que podem ser discutidas em consulta, limites da evidência e alertas específicos. Não prescreva doses, hormônios, medicamentos ou suplementos. Não escreva o artigo final e não invente fontes.`;
    const { response, usage } = await generateAi(ai, "research", {
      contents: prompt,
      config: { responseMimeType: "application/json", responseJsonSchema: researchSchema, tools: [{ googleSearch: {} }] },
    });
    const research = parseJson<{ summary: string; keyPoints: string[] }>(response.text);
    const sources = extractGroundingSources(response)
      .filter((source) => !LOW_TRUST_DOMAINS.test(source.url))
      .map((source) => ({ ...source, sourceType: classifySource(source.url) }))
      .sort((left, right) => Number(right.sourceType.startsWith("Base") || right.sourceType.startsWith("Revisão")) - Number(left.sourceType.startsWith("Base") || left.sourceType.startsWith("Revisão")))
      .slice(0, 6);

    if (!sources.length) {
      return NextResponse.json({ error: "Não encontrei referências suficientes para começar esta pesquisa. Tente deixar o tema mais específico." }, { status: 422 });
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
