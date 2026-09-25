import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCreativeDirection, originalityRules } from "@/lib/creative-direction";
import { authenticateAiRequest } from "@/lib/ai/auth";
import { loadAiContext, parseJson, recordGeneration, suggestMemoryFromNotes, topicTags } from "@/lib/ai/context";
import { validateAccessoryTrace } from "@/lib/ai/copy-quality";
import { extractGroundingSources } from "@/lib/ai/grounding";
import { LUANA_VOICE, POLL_SUGGESTION_RULES, QUICK_SUMMARY_RULES, QUICK_SUMMARY_RULES_ARTIGO, SCIENCE_RULES, SIMPLE_LANGUAGE_RULES, TAG_SUGGESTION_RULES, TRUTH_RULES } from "@/lib/ai/identity";
import { buildAccessoryPrompt } from "@/lib/ai/prompts";
import { accessorySchema, productSchema } from "@/lib/ai/schemas";
import { combineUsage, generateAi, normalizeCacheSubject, type AiUsage } from "@/lib/ai/runtime";
import { EMPTY_RESUMO_RAPIDO, type ResumoRapido } from "@/lib/summary";
import { filterValidTagSlugs, formatTagsForPrompt, type Tag } from "@/lib/tags";

export const maxDuration = 60;

type PollSuggestion = { question: string; options: string[] };
const EMPTY_POLL_SUGGESTION: PollSuggestion = { question: "", options: [] };

type ProductGeneration = {
  productName: string; productReview: string; blogTitle: string; blogPost: string;
  identificationConfidence: "alta" | "media" | "baixa";
  evidenceLevel: "forte" | "moderada" | "inicial" | "nao_verificada" | "nao_aplicavel";
  experienceStatus: "testado" | "impressao_inicial" | "pesquisado" | "nao_informado";
  researchSummary: string; openingStyle: string; structureStyle: string; notablePhrases: string[];
  inputDetailsUsed?: string[]; humorApplied?: boolean; resumoRapido: ResumoRapido;
  resumoRapidoArtigo: ResumoRapido; suggestedTagSlugs: string[]; suggestedPoll: PollSuggestion;
};
type ResearchResult = { summary: string; evidenceLevel: ProductGeneration["evidenceLevel"] };

const identificationSchema = {
  type: "object", properties: { productName: { type: "string" }, brand: { type: "string" }, confidence: { type: "string", enum: ["alta", "media", "baixa"] } },
  required: ["productName", "brand", "confidence"], additionalProperties: false,
};
const researchSchema = {
  type: "object", properties: { summary: { type: "string" }, evidenceLevel: { type: "string", enum: ["forte", "moderada", "inicial", "nao_verificada"] } },
  required: ["summary", "evidenceLevel"], additionalProperties: false,
};

function resolveExperienceStatus(experienceStatus: string | undefined, impressions: string | undefined) {
  if (experienceStatus && experienceStatus !== "nao_informado") return experienceStatus as ProductGeneration["experienceStatus"];
  const notes = String(impressions || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/\b(uso|usei|testei|aplico|apliquei|estou usando|venho usando)\b/.test(notes)) return "testado";
  if (/\b(gostei|adorei|percebi|senti|minha pele|minha impressao)\b/.test(notes)) return "impressao_inicial";
  return "nao_informado";
}

async function fetchImagePart(imageUrl: string | undefined) {
  if (!imageUrl?.startsWith("http")) return null;
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(4_000) });
  if (!response.ok) return null;
  const data = Buffer.from(await response.arrayBuffer());
  return { part: { inlineData: { data: data.toString("base64"), mimeType: response.headers.get("content-type") || "image/jpeg" } }, hash: createHash("sha256").update(data).digest("hex") };
}

export async function POST(req: Request) {
  const requestStartedAt = Date.now();
  try {
    const { supabase, user } = await authenticateAiRequest(req);
    const body = await req.json();
    const { title, link, impressions, imageUrl, isAccessory, experienceStatus, testDuration } = body;
    const requestId = String(body.requestId || req.headers.get("x-request-id") || crypto.randomUUID());
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const timings: Record<string, number> = {};
    const usages: AiUsage[] = [];

    const imageStartedAt = Date.now();
    const image = (!title || isAccessory) ? await fetchImagePart(imageUrl) : null;
    timings.image = Date.now() - imageStartedAt;
    const promptVersion = isAccessory ? "accessory-v2" : "review-v3";
    const requestHash = createHash("sha256").update(JSON.stringify({ promptVersion, title, link, impressions, isAccessory, experienceStatus, testDuration, image: image?.hash || "" })).digest("hex");
    const cacheStartedAt = Date.now();
    const { data: responseCache } = await supabase.from("ai_response_cache").select("response").eq("user_id", user.id).eq("request_hash", requestHash).gt("expires_at", new Date().toISOString()).maybeSingle();
    timings.responseCache = Date.now() - cacheStartedAt;
    if (responseCache?.response) {
      await recordGeneration(supabase, user.id, { contentType: isAccessory ? "accessory" : "review", topic: title, cacheHit: true, requestId, stageTimings: timings });
      return NextResponse.json({ ...(responseCache.response as ProductGeneration), performance: { cached: true, durationMs: Date.now() - requestStartedAt } });
    }

    const contentType = isAccessory ? "accessory" : "review";
    const contextPromise = loadAiContext(supabase, user.id, contentType, topicTags(title, impressions, isAccessory ? "moda acessorio" : "skincare cosmetico"));
    const tagsPromise = supabase.from("tags").select("id,name,slug,type");
    const resolvedStatus = resolveExperienceStatus(experienceStatus, impressions);
    if (isAccessory) {
      const [context, { data: tagRows }] = await Promise.all([contextPromise, tagsPromise]);
      const tags = (tagRows || []) as Tag[];
      const started = Date.now();
      let generated: ProductGeneration | null = null;
      let retryFeedback: string[] | undefined;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const prompt = buildAccessoryPrompt({
          title,
          link,
          impressions,
          experienceStatus: resolvedStatus,
          testDuration,
          memoryPrompt: context.memoryPrompt,
          antiRepetitionPrompt: context.antiRepetitionPrompt,
          tagsPrompt: formatTagsForPrompt(tags),
          retryFeedback,
        });
        const { response, usage } = await generateAi(ai, "accessory", {
          contents: image ? [image.part, prompt] : prompt,
          config: { responseMimeType: "application/json", responseJsonSchema: accessorySchema, temperature: attempt === 0 ? 0.8 : 0.55, mediaResolution: "MEDIA_RESOLUTION_LOW" },
        });
        usages.push(usage);
        generated = parseJson<ProductGeneration>(response.text);
        const trace = validateAccessoryTrace(impressions || "", generated.inputDetailsUsed || [], Boolean(generated.humorApplied), generated.productReview);
        if (trace.valid) break;
        retryFeedback = trace.errors;
      }
      timings.writing = Date.now() - started;
      if (!generated) throw new Error("A resposta da IA veio incompleta.");
      const trace = validateAccessoryTrace(impressions || "", generated.inputDetailsUsed || [], Boolean(generated.humorApplied), generated.productReview);
      if (!trace.valid) throw new Error(`A resposta da IA veio incompleta: ${trace.errors.join(" ")}`);
      generated.experienceStatus = resolvedStatus;
      generated.inputDetailsUsed ||= [];
      generated.humorApplied = Boolean(generated.humorApplied);
      generated.resumoRapido ||= EMPTY_RESUMO_RAPIDO;
      generated.resumoRapidoArtigo = EMPTY_RESUMO_RAPIDO;
      generated.suggestedTagSlugs = filterValidTagSlugs(generated.suggestedTagSlugs, tags);
      generated.suggestedPoll = EMPTY_POLL_SUGGESTION;
      await finalizeGeneration({ supabase, userId: user.id, requestHash, requestId, generated, context, contentType, title, usages, timings, cacheHit: false, retryCount: retryFeedback ? 1 : 0, searchQueries: 0 });
      return NextResponse.json({ ...generated, sources: [], performance: { cached: false, durationMs: Date.now() - requestStartedAt } });
    }

    let productName = String(title || "").trim();
    let identificationConfidence: ProductGeneration["identificationConfidence"] = productName ? "alta" : "baixa";
    if (!productName && image) {
      const started = Date.now();
      const { response, usage } = await generateAi(ai, "identify", { contents: [image.part, "Leia a embalagem. Retorne nome exato do produto, marca e confiança. Não invente texto ilegível."], config: { responseMimeType: "application/json", responseJsonSchema: identificationSchema, mediaResolution: "MEDIA_RESOLUTION_LOW" } });
      timings.identification = Date.now() - started; usages.push(usage);
      const identified = parseJson<{ productName: string; brand: string; confidence: ProductGeneration["identificationConfidence"] }>(response.text);
      productName = [identified.brand, identified.productName].filter(Boolean).join(" ").trim();
      identificationConfidence = identified.confidence;
    }
    if (!productName) productName = "Produto não identificado";

    const cacheKey = `review-v3-${normalizeCacheSubject(productName || link || "produto")}`;
    const researchCacheStartedAt = Date.now();
    const { data: cachedResearch } = await supabase.from("ai_research_cache").select("summary,sources").eq("user_id", user.id).eq("cache_key", cacheKey).gt("expires_at", new Date().toISOString()).maybeSingle();
    timings.researchCache = Date.now() - researchCacheStartedAt;
    let research: ResearchResult;
    let sources = cachedResearch?.sources || [];
    let searchQueries = 0;
    if (cachedResearch) {
      research = parseJson<ResearchResult>(cachedResearch.summary);
    } else {
      const started = Date.now();
      const researchPrompt = `${TRUTH_RULES}\n${SCIENCE_RULES}

Pesquise o cosmético "${productName}". Link informado: ${link || "não informado"}.
Comece pela página oficial da marca para fórmula, ativos, modo de uso e promessas. Depois verifique os principais ativos em Anvisa, Ministério da Saúde, sociedades médicas, PubMed, revisões e periódicos. Diferencie alegação da marca, evidência do ingrediente e teste do produto final.
Retorne resumo factual de até 3.500 caracteres com ativos confirmados, funções, modo de uso, domínio da fonte oficial e limitações. Não escreva artigo nem opinião da Luana.`;
      const { response, usage } = await generateAi(ai, "research", { contents: researchPrompt, config: { responseMimeType: "application/json", responseJsonSchema: researchSchema, tools: [{ googleSearch: {} }] } });
      timings.research = Date.now() - started; usages.push(usage);
      research = parseJson<ResearchResult>(response.text);
      sources = extractGroundingSources(response);
      searchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries?.length || 0;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await supabase.from("ai_research_cache").upsert({ user_id: user.id, cache_key: cacheKey, subject: productName, summary: JSON.stringify(research), sources, expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString() }, { onConflict: "user_id,cache_key" });
    }

    const [context, { data: tagRows }] = await Promise.all([contextPromise, tagsPromise]);
    const tags = (tagRows || []) as Tag[];
    const writingPrompt = `${LUANA_VOICE}\n${TRUTH_RULES}\n${SIMPLE_LANGUAGE_RULES}\n${SCIENCE_RULES}\n${QUICK_SUMMARY_RULES}\n${QUICK_SUMMARY_RULES_ARTIGO}\n${TAG_SUGGESTION_RULES}\n${POLL_SUGGESTION_RULES}\n${context.memoryPrompt}\n${context.antiRepetitionPrompt}

DIREÇÃO CRIATIVA: ${getCreativeDirection()}.\n${originalityRules}
Produto: "${productName}". Confiança: ${identificationConfidence}. Link: ${link || "não informado"}.
Notas pessoais: "${impressions || "Nenhuma experiência pessoal informada; trate como pesquisa, nunca como teste."}". Status: ${resolvedStatus}. Tempo de uso: ${testDuration || "não informado"}.
PESQUISA VERIFICADA, SEM EXTRAPOLAR: ${research.summary}
TAGS DISPONÍVEIS:
${formatTagsForPrompt(tags)}

Crie productReview em primeira pessoa, 4 a 7 frases, com as notas como coração, explicação leve de 1 ou 2 ativos e 1 a 3 emojis. Não invente uso. Termine exatamente com: <br><br><a href="/resenhas" class="text-[var(--color-gold)] underline">Quer entender a mágica por trás desses ativos? Vem ler a minha coluna "Estudei para te explicar" no Diário!</a>
blogTitle deve ser um título criativo e único destacando o poder ou benefício principal do produto/ativo para a pele madura. NUNCA use "Estudei para te explicar:" nem comece com "A verdade sobre...". Varie o formato a cada geração. blogPost deve usar HTML, parágrafos curtos e exatamente estes títulos, nesta ordem:
<i>[conclusão curta sem promessa milagrosa]</i>
<h3>📣 A Promessa da Indústria</h3>
<h3>🧴 Afinal, o que tem na fórmula?</h3>
<h3>🔬 O que a ciência diz sobre esses ativos?</h3>
<h3>✨ E a nossa pele madura, ganha o quê com isso?</h3>
<h3>🪞 Manual de Sobrevivência</h3>
<h3>⚖️ É hype ou é milagre?</h3>
Diferencie promessa, evidência e experiência; não liste fontes ou URLs. Finalize com: <br><br><a href="${link || "#"}" target="_blank" class="text-[var(--color-gold)] font-bold underline">✨ Ver o produto indicado pela Luana</a>
researchSummary deve reutilizar o resumo fornecido. evidenceLevel deve ser ${research.evidenceLevel}.
resumoRapido deve resumir o productReview que você acabou de escrever, pra ficha do produto na Vitrine. resumoRapidoArtigo deve resumir o blogPost, pra ficha do artigo (são resumos diferentes, um do produto e outro do ativo/tema). suggestedTagSlugs e suggestedPoll seguem as regras acima.`;

    let retryCount = 0;
    const writingStartedAt = Date.now();
    let generated: ProductGeneration;
    try {
      const result = await generateAi(ai, "product", { contents: writingPrompt, config: { responseMimeType: "application/json", responseJsonSchema: productSchema, temperature: 0.75 } });
      usages.push(result.usage); generated = parseJson<ProductGeneration>(result.response.text);
    } catch {
      retryCount = 1;
      const result = await generateAi(ai, "product", { contents: `${writingPrompt}\nA resposta anterior falhou na formatação. Gere o objeto completo, conciso e válido, sem nova pesquisa.`, config: { responseMimeType: "application/json", responseJsonSchema: productSchema, temperature: 0.35 } });
      usages.push(result.usage); generated = parseJson<ProductGeneration>(result.response.text);
    }
    timings.writing = Date.now() - writingStartedAt;
    generated.productName ||= productName;
    generated.identificationConfidence = identificationConfidence;
    generated.evidenceLevel = research.evidenceLevel;
    generated.experienceStatus = resolvedStatus;
    generated.resumoRapido ||= EMPTY_RESUMO_RAPIDO;
    generated.resumoRapidoArtigo ||= EMPTY_RESUMO_RAPIDO;
    generated.suggestedTagSlugs = filterValidTagSlugs(generated.suggestedTagSlugs, tags);
    generated.suggestedPoll = generated.suggestedPoll?.question?.trim() && generated.suggestedPoll.options?.filter((o) => o.trim()).length >= 2
      ? { question: generated.suggestedPoll.question.trim(), options: generated.suggestedPoll.options.map((o) => o.trim()).filter(Boolean) }
      : EMPTY_POLL_SUGGESTION;
    generated.researchSummary = research.summary.slice(0, 3500);
    if (!generated.productReview.includes('href="/resenhas"')) generated.productReview += `<br><br><a href="/resenhas" class="text-[var(--color-gold)] underline">Quer entender a mágica por trás desses ativos? Vem ler a minha coluna "Estudei para te explicar" no Diário!</a>`;

    await finalizeGeneration({ supabase, userId: user.id, requestHash, requestId, generated, context, contentType, title: productName, usages, timings, cacheHit: Boolean(cachedResearch), retryCount, searchQueries });
    await suggestMemoryFromNotes(supabase, user.id, impressions, topicTags(productName, impressions, "skincare cosmetico"));
    return NextResponse.json({ ...generated, sources, performance: { cached: Boolean(cachedResearch), durationMs: Date.now() - requestStartedAt, stages: timings } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao gerar conteúdo";
    return NextResponse.json({ error: message }, { status: message.includes("autoriz") || message.includes("Sessão") ? 401 : 500 });
  }
}

async function finalizeGeneration(args: {
  supabase: Awaited<ReturnType<typeof authenticateAiRequest>>["supabase"]; userId: string; requestHash: string; requestId: string;
  generated: ProductGeneration; context: Awaited<ReturnType<typeof loadAiContext>>; contentType: string; title: string;
  usages: AiUsage[]; timings: Record<string, number>; cacheHit: boolean; retryCount: number; searchQueries: number;
}) {
  const usage = combineUsage(args.usages);
  usage.durationMs = Object.values(args.timings).reduce((sum, value) => sum + value, 0);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await args.supabase.from("ai_response_cache").upsert({ user_id: args.userId, request_hash: args.requestHash, response: args.generated, expires_at: expiresAt.toISOString() }, { onConflict: "user_id,request_hash" });
  await recordGeneration(args.supabase, args.userId, {
    contentType: args.contentType, topic: args.title, title: args.generated.blogTitle || args.generated.productName,
    openingStyle: args.generated.openingStyle, structureStyle: args.generated.structureStyle, notablePhrases: args.generated.notablePhrases,
    memoryIds: args.context.memoryIds, usage, searchQueries: args.searchQueries, cacheHit: args.cacheHit,
    retryCount: args.retryCount, requestId: args.requestId, stageTimings: args.timings,
  });
}
