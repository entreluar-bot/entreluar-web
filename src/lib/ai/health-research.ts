import type { GoogleGenAI } from "@google/genai";
import { extractGroundingSources } from "./grounding";
import { parseJson } from "./context";
import { combineUsage, generateAi, type AiUsage } from "./runtime";
import { SCIENCE_RULES, TRUTH_RULES } from "./identity";

export type HealthResearchSource = { title: string; url: string; sourceType: string };

const FOUNDATION_DOMAINS = /(who\.int|gov\.br|anvisa\.gov\.br|acog\.org|menopause\.org|nice\.org\.uk|cochranelibrary\.com|pubmed\.ncbi\.nlm\.nih\.gov|nih\.gov|febrasgo\.org\.br|sbem\.org\.br|endocrine\.org|jamanetwork\.com|bmj\.com|thelancet\.com)/i;
const CLINICAL_DOMAINS = /(nhs\.uk|mayoclinic\.org|clevelandclinic\.org|hopkinsmedicine\.org|msdmanuals\.com|health\.harvard\.edu)/i;

const researchSchema = {
  type: "object",
  properties: { summary: { type: "string" }, keyPoints: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 } },
  required: ["summary", "keyPoints"],
  additionalProperties: false,
};

function classifySource(url: string) {
  if (FOUNDATION_DOMAINS.test(url)) return /pubmed|jamanetwork|bmj|thelancet|cochrane/i.test(url) ? "Revisão ou estudo científico" : "Base científica: diretriz ou órgão de saúde";
  if (CLINICAL_DOMAINS.test(url)) return "Explicação clínica complementar";
  return "Fonte encontrada na pesquisa — revise antes de usar";
}

function extractUrlSourcesFromText(text: string) {
  const urls = text.match(/https?:\/\/[^\s)>\]}",]+/gi) || [];
  return Array.from(new Set(urls)).map((url) => {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return { title: host, url };
    } catch {
      return null;
    }
  }).filter((source): source is { title: string; url: string } => Boolean(source));
}

export async function researchHealthTopic(ai: GoogleGenAI, topic: string): Promise<{ brief: string; sources: HealthResearchSource[]; usage: AiUsage }> {
  const prompt = `${TRUTH_RULES}\n${SCIENCE_RULES}

Pesquise o tema de saúde feminina madura: "${topic}".
Traga ao menos uma referência com URL real encontrada na web. Priorize órgão de saúde, diretriz, estudo ou hospital quando existirem, mas não bloqueie temas cotidianos por não haver uma fonte "perfeita": uma fonte menor ou complementar ainda deve aparecer identificada para a Luana decidir se usa. Nunca invente título ou URL.

Organize um BRIEF factual para outra IA escrever uma crônica pesquisada da Luana: explique mecanismo ou contexto, sintomas quando relevantes, opções de cuidado ou tratamento que podem ser discutidas em consulta, limites da evidência e alertas específicos. Não prescreva doses, hormônios, medicamentos ou suplementos. Não escreva o artigo final e não invente fontes.`;
  const { response, usage } = await generateAi(ai, "research", { contents: prompt, config: { responseMimeType: "application/json", responseJsonSchema: researchSchema, tools: [{ googleSearch: {} }] } });
  const research = parseJson<{ summary: string; keyPoints: string[] }>(response.text);
  let finalUsage = usage;
  let rawSources = extractGroundingSources(response);
  // Alguns retornos estruturados respondem corretamente ao brief, mas omitem os
  // grounding chunks. Uma segunda busca simples costuma devolver os links reais.
  if (!rawSources.length) {
    const fallback = await generateAi(ai, "research", {
      contents: `Busque na web uma referência para "${topic}". Responda em texto curto, sem inventar links; preciso que a ferramenta de busca registre ao menos uma URL real para a Luana revisar.`,
      config: { tools: [{ googleSearch: {} }], temperature: 0.1 },
    });
    rawSources = extractGroundingSources(fallback.response);
    // Em algumas respostas, a busca devolve o link no texto, mas não expõe os
    // metadados de grounding. Preservamos a URL para a Luana avaliar, em vez de
    // fingir que nenhuma referência foi encontrada.
    if (!rawSources.length) rawSources = extractUrlSourcesFromText(fallback.response.text || "");
    finalUsage = combineUsage([usage, fallback.usage]);
  }
  const sources = rawSources
    .map((source) => ({ ...source, sourceType: classifySource(source.url) }))
    .sort((left, right) => Number(right.sourceType.startsWith("Base") || right.sourceType.startsWith("Revisão")) - Number(left.sourceType.startsWith("Base") || left.sourceType.startsWith("Revisão")))
    .slice(0, 6);
  return { brief: `${research.summary}\n\nPontos para conferir:\n${research.keyPoints.map((point) => `• ${point}`).join("\n")}`, sources, usage: finalUsage };
}
