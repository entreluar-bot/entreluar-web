import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getCreativeDirection, originalityRules } from "@/lib/creative-direction";
import { authenticateAiRequest } from "@/lib/ai/auth";
import { loadAiContext, parseJson, recordGeneration, suggestMemoryFromNotes, topicTags } from "@/lib/ai/context";
import { extractGroundingSources, sourcesHtml } from "@/lib/ai/grounding";
import { LUANA_VOICE, SCIENCE_RULES, SIMPLE_LANGUAGE_RULES, TRUTH_RULES } from "@/lib/ai/identity";
import { productSchema } from "@/lib/ai/schemas";

export const maxDuration = 60;

type ProductGeneration = {
  productName: string;
  productReview: string;
  blogTitle: string;
  blogPost: string;
  identificationConfidence: "alta" | "media" | "baixa";
  evidenceLevel: "forte" | "moderada" | "inicial" | "nao_verificada" | "nao_aplicavel";
  experienceStatus: "testado" | "impressao_inicial" | "pesquisado" | "nao_informado";
  researchSummary: string;
  openingStyle: string;
  structureStyle: string;
  notablePhrases: string[];
};

export async function POST(req: Request) {
  try {
    const { supabase, user } = await authenticateAiRequest(req);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const { title, link, impressions, imageUrl, isAccessory, experienceStatus, testDuration } = await req.json();
    let imagePart = null;

    if (imageUrl && imageUrl.startsWith("http")) {
      const imgRes = await fetch(imageUrl);
      const arrayBuffer = await imgRes.arrayBuffer();
      imagePart = { inlineData: { data: Buffer.from(arrayBuffer).toString("base64"), mimeType: imgRes.headers.get("content-type") || "image/jpeg" } };
    }

    const contentType = isAccessory ? "accessory" : "review";
    const context = await loadAiContext(supabase, user.id, contentType, topicTags(title, impressions, isAccessory ? "moda acessorio" : "skincare cosmetico"));
    const cacheKey = String(title || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
    const { data: cachedResearch } = !isAccessory && cacheKey
      ? await supabase.from("ai_research_cache").select("summary,sources").eq("user_id", user.id).eq("cache_key", cacheKey).gt("expires_at", new Date().toISOString()).maybeSingle()
      : { data: null };
    let prompt: string;

    if (isAccessory) {
      prompt = `${LUANA_VOICE}
${TRUTH_RULES}
${SIMPLE_LANGUAGE_RULES}
${context.memoryPrompt}
${context.antiRepetitionPrompt}
${originalityRules}

Produto de estilo: "${title || "Identifique somente se a imagem permitir"}". Link: ${link || "não informado"}.
Notas pessoais: "${impressions || "Nenhuma experiência pessoal informada."}"
Status informado pela Luana: ${experienceStatus || "nao_informado"}. Tempo de uso: ${testDuration || "não informado"}.

Crie uma productReview breve, concreta e fluida, com no máximo 1 emoji. Avalie apenas o que estiver visível ou informado: acabamento aparente, versatilidade, ocasião e combinações. Não afirme conforto, durabilidade ou uso pessoal sem confirmação. Se nome ou marca não estiverem legíveis, use um nome descritivo e marque identificationConfidence como baixa. Não fale de ciência ou pele. blogTitle, blogPost e researchSummary devem ser vazios; evidenceLevel deve ser nao_aplicavel.`;
    } else {
      prompt = `${LUANA_VOICE}
${TRUTH_RULES}
${SIMPLE_LANGUAGE_RULES}
${SCIENCE_RULES}
${context.memoryPrompt}
${context.antiRepetitionPrompt}

DIREÇÃO CRIATIVA: ${getCreativeDirection()}.
${originalityRules}

Produto: "${title || "Identifique somente se a imagem permitir"}". Link: ${link || "não informado"}.
Notas pessoais: "${impressions || "Nenhuma experiência pessoal informada; trate como pesquisa, nunca como teste."}"
Status informado pela Luana: ${experienceStatus || "nao_informado"}. Tempo de uso: ${testDuration || "não informado"}. Respeite exatamente esse status no campo experienceStatus e na narrativa.
${cachedResearch ? `PESQUISA RECENTE EM CACHE (reutilize para economizar busca; não extrapole): ${cachedResearch.summary}` : "Faça uma pesquisa web fundamentada nesta geração."}

1. Identifique nome e marca apenas com a confiança permitida pelos dados.
2. Pesquise composição, alegações e evidências atuais. Priorize Anvisa, Ministério da Saúde, sociedades médicas, PubMed e periódicos científicos; material comercial serve apenas para composição, uso e alegações da marca.
3. Crie productReview breve e concreta. Se não houve teste, apresente como achado pesquisado.
4. Crie blogPost em HTML (<p>, <h3>, <i>, <strong>, <ul>, <li>) com 3 a 5 subtítulos específicos. Explique promessa, evidência, utilidade para pele madura, limitações e uso prático. Não inclua a lista de fontes: o sistema fará isso.
5. Termine naturalmente e inclua apenas então: <br><br><a href="${link || "#"}" target="_blank" class="text-[var(--color-gold)] font-bold underline">✨ Ver o produto indicado pela Luana</a>
6. researchSummary deve conter, em até 600 caracteres, apenas fatos reutilizáveis e limitações da pesquisa.`;
    }

    const contents: Array<string | { inlineData: { data: string; mimeType: string } }> = [];
    if (imagePart) contents.push(imagePart);
    contents.push(prompt);

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: productSchema,
        temperature: isAccessory ? 0.8 : 0.55,
        maxOutputTokens: isAccessory ? 900 : 3400,
        ...(!isAccessory && !cachedResearch ? { tools: [{ googleSearch: {} }] } : {}),
      },
    });

    const generated = parseJson<ProductGeneration>(response.text);
    const sources = isAccessory ? [] : (cachedResearch?.sources || extractGroundingSources(response));
    if (!isAccessory) generated.blogPost += sourcesHtml(sources);
    if (!isAccessory && cacheKey && !cachedResearch && generated.researchSummary) {
      const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 30);
      await supabase.from("ai_research_cache").upsert({ user_id: user.id, cache_key: cacheKey, subject: generated.productName || title || cacheKey, summary: generated.researchSummary.slice(0, 1200), sources, expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString() }, { onConflict: "user_id,cache_key" });
    }
    await recordGeneration(supabase, user.id, {
      contentType,
      topic: title,
      title: generated.blogTitle || generated.productName,
      openingStyle: generated.openingStyle,
      structureStyle: generated.structureStyle,
      notablePhrases: generated.notablePhrases,
      memoryIds: context.memoryIds,
      sourceCount: sources.length,
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount,
      searchQueries: response.candidates?.[0]?.groundingMetadata?.webSearchQueries?.length || 0,
    });
    await suggestMemoryFromNotes(supabase, user.id, impressions, topicTags(title, impressions, isAccessory ? "moda acessorio" : "skincare cosmetico"));
    return NextResponse.json({ ...generated, sources });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao gerar conteúdo";
    return NextResponse.json({ error: message }, { status: message.includes("autoriz") || message.includes("Sessão") ? 401 : 500 });
  }
}
