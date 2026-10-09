import { NextResponse } from "next/server"; 
import { GoogleGenAI } from "@google/genai"; 
import { getEditorialDirection, getProductCreativeDirection, originalityRules } from "@/lib/creative-direction";
import { authenticateAiRequest } from "@/lib/ai/auth";
import { loadAiContext, parseJson, recordGeneration, suggestMemoryFromNotes, topicTags } from "@/lib/ai/context";
import { validateReviewCopy } from "@/lib/ai/copy-quality";
import { LUANA_VOICE, PRODUCT_REVIEW_STYLE_RULES, QUICK_SUMMARY_RULES, SCIENCE_RULES, SIMPLE_LANGUAGE_RULES, TRUTH_RULES } from "@/lib/ai/identity";
import { postSchema } from "@/lib/ai/schemas";
import { combineUsage, generateAi } from "@/lib/ai/runtime";
import { EMPTY_RESUMO_RAPIDO, type ResumoRapido } from "@/lib/summary";

export const maxDuration = 60; 

export async function POST(req: Request) { 
  try { 
    const { supabase, user } = await authenticateAiRequest(req);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" }); 
    const body = await req.json(); 
    
    if (body.action === "brainstorm") { 
      const context = await loadAiContext(supabase, user.id, "brainstorm", ["menopausa", "beleza", "autocuidado"]);
      const prompt = `${LUANA_VOICE}\n${context.memoryPrompt}\n${context.antiRepetitionPrompt}\nGere 3 pautas distintas para o Diário. Misture identificação, serviço e opinião. Para cada uma, escreva em uma linha: título específico — ângulo — por que importa para a leitora. Evite clickbait, temas genéricos e variações da mesma ideia. Não numere e não use markdown.`;
      const { response, usage } = await generateAi(ai, "brainstorm", {
        contents: prompt,
        config: { temperature: 0.9 },
      }); 
      await recordGeneration(supabase, user.id, { contentType: "brainstorm", notablePhrases: (response.text || "").split("\n").slice(0, 3), memoryIds: context.memoryIds, usage });
      return NextResponse.json({ text: response.text }); 
    } 
    
    const { title, impressions, category, imageUrl } = body; 
    let imagePart = null; 
    if (imageUrl && imageUrl.startsWith("http")) { 
      const imgRes = await fetch(imageUrl); 
      const arrayBuffer = await imgRes.arrayBuffer(); 
      const buffer = Buffer.from(arrayBuffer); 
      const mimeType = imgRes.headers.get("content-type") || "image/jpeg"; 
      imagePart = { inlineData: { data: buffer.toString("base64"), mimeType } }; 
    } 
    
    const context = await loadAiContext(supabase, user.id, "blog", topicTags(title, impressions, category));
    const isEstudei = category === "Estudei para te explicar";
    const creativeDirection = isEstudei
      ? getProductCreativeDirection()
      : getEditorialDirection({ hasPersonalNotes: Boolean(impressions?.trim()), recentOpeningStyles: context.antiRepetitionPrompt.split("\n").slice(0, 3) });
    const prompt = `${LUANA_VOICE}\n${TRUTH_RULES}\n${SIMPLE_LANGUAGE_RULES}\n${isEstudei ? `${SCIENCE_RULES}\n${PRODUCT_REVIEW_STYLE_RULES}\n` : ""}${QUICK_SUMMARY_RULES}\n${context.memoryPrompt}\n${context.antiRepetitionPrompt}

Escreva um artigo completo para a categoria "${category || "Diário"}" do blog. Tema: "${title || "Crônica de uma mulher madura"}". NOTAS PESSOAIS DA LUANA: "${impressions || "Nenhuma nota pessoal fornecida."}"

DIREÇÃO CRIATIVA EXCLUSIVA DESTA GERAÇÃO: ${creativeDirection}.
${originalityRules}

Não copie as notas literalmente: preserve o sentido e desenvolva somente o que elas sustentam. Use HTML (<p>, <h3>, <i>, <strong>, <ul>, <ol>). Crie um título específico, curioso e fiel ao benefício, pergunta ou ideia central deste texto. O título deve ter personalidade sem prometer algo que o artigo não entrega. O imagePrompt deve ser em inglês, nascer do conceito deste texto e evitar clichês de vinho, café, robe, luxo genérico e mulher diante do espelho.
${isEstudei ? "Como este texto é de \"Estudei para te explicar\", faça internamente um mapa editorial com: ativo/tema, benefício real, limitação, modo de uso quando houver base e conexão com o momento da maturidade. Não mostre esse mapa. Cubra promessa, fórmula/ativos ou mecanismo, ciência em português simples, ganho para pele madura, uso prático e veredito honesto. Use títulos <h3> criativos e específicos do tema; NÃO use os títulos fixos antigos \"A Promessa da Indústria\", \"Afinal, o que tem na fórmula?\", \"O que a ciência diz sobre esses ativos?\", \"E a nossa pele madura, ganha o quê com isso?\", \"Manual de Sobrevivência\" nem \"É hype ou é milagre?\". Priorize benefícios, tradução simples da ciência e uso prático: textura, quantidade, movimentos de aplicação, frequência diária ou intervalada, sol/protetor, ordem na rotina e cuidados de combinação quando houver base nas notas ou pesquisa. Não escreva disclaimer genérico sobre procedimentos estéticos, dermatologista, consulta ou tratamento profissional." : ""}

Além do texto, avalie se existe uma pergunta natural que renda conversa entre leitoras. Só gere suggestedPoll quando ela fizer sentido; caso contrário, retorne question vazio e options vazias. Gere também sugestões de tags (suggestedTagSlugs) no formato slug (ex: pele-madura, autocuidado).
${isEstudei ? "resumoRapido deve resumir o artigo (text) que você acabou de escrever — é a ficha rápida de \"Estudei para te explicar\"." : "Este é um artigo de Papo de Mulher (crônica/relato, não ficha de produto/ativo): devolva todos os campos de resumoRapido como string vazia \"\"."}`;
    const contents = []; 
    if (imagePart) contents.push(imagePart); 
    contents.push(prompt); 
    
    let { response, usage } = await generateAi(ai, "blog", {
      contents,
      config: { responseMimeType: "application/json", responseJsonSchema: postSchema, temperature: 0.85 },
    }); 

    let generated = parseJson<{ title: string; text: string; imagePrompt: string; openingStyle: string; structureStyle: string; closingStyle: string; notablePhrases: string[]; resumoRapido: ResumoRapido; suggestedTagSlugs: string[]; suggestedPoll: { question: string; options: string[] } }>(response.text);
    let finalUsage = usage;
    const reviewQuality = validateReviewCopy(generated.text, {
      evidenceText: isEstudei ? `${title || ""} ${impressions || ""}` : undefined,
      notesText: impressions,
      isEstudei,
      enforceEditorialDiversity: true,
    });
    if (!reviewQuality.valid) {
      const retry = await generateAi(ai, "blog", {
        contents: [...contents, `CORRIJA A RESPOSTA ANTERIOR: ${reviewQuality.errors.join(" ")} Remova disclaimer genérico, clichês e títulos fixos antigos. Traga ao menos um dado concreto do tema, ativo, nota ou pesquisa. Mantenha linguagem simples, positiva, próxima, com humor leve e conselhos práticos de uso. Gere o objeto completo e válido.`],
        config: { responseMimeType: "application/json", responseJsonSchema: postSchema, temperature: 0.45 },
      });
      response = retry.response;
      finalUsage = combineUsage([usage, retry.usage]);
      generated = parseJson<typeof generated>(response.text);
      const retryQuality = validateReviewCopy(generated.text, {
        evidenceText: isEstudei ? `${title || ""} ${impressions || ""}` : undefined,
        notesText: impressions,
        isEstudei,
        enforceEditorialDiversity: true,
      });
      if (!retryQuality.valid) throw new Error(`A resposta da IA veio incompleta: ${retryQuality.errors.join(" ")}`);
    }
    generated.resumoRapido ||= EMPTY_RESUMO_RAPIDO;
    await recordGeneration(supabase, user.id, { contentType: "blog", topic: `${title || ""} ${category || ""}`, title: generated.title, openingStyle: generated.openingStyle, structureStyle: generated.structureStyle, closingStyle: generated.closingStyle, notablePhrases: generated.notablePhrases, memoryIds: context.memoryIds, usage: finalUsage });
    await suggestMemoryFromNotes(supabase, user.id, impressions, topicTags(title, impressions, category));
    return NextResponse.json(generated);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao gerar postagem" }, { status: 500 });
  } 
}
