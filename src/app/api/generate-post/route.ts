import { NextResponse } from "next/server"; 
import { GoogleGenAI } from "@google/genai"; 
import { getCreativeDirection, originalityRules } from "@/lib/creative-direction";
import { authenticateAiRequest } from "@/lib/ai/auth";
import { loadAiContext, parseJson, recordGeneration, suggestMemoryFromNotes, topicTags } from "@/lib/ai/context";
import { LUANA_VOICE, QUICK_SUMMARY_RULES, SIMPLE_LANGUAGE_RULES, TRUTH_RULES } from "@/lib/ai/identity";
import { postSchema } from "@/lib/ai/schemas";
import { generateAi } from "@/lib/ai/runtime";
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
    const prompt = `${LUANA_VOICE}\n${TRUTH_RULES}\n${SIMPLE_LANGUAGE_RULES}\n${QUICK_SUMMARY_RULES}\n${context.memoryPrompt}\n${context.antiRepetitionPrompt}

Escreva um artigo completo para a categoria "${category || "Diário"}" do blog. Tema: "${title || "Crônica de uma mulher madura"}". NOTAS PESSOAIS DA LUANA: "${impressions || "Nenhuma nota pessoal fornecida."}"

DIREÇÃO CRIATIVA EXCLUSIVA DESTA GERAÇÃO: ${getCreativeDirection()}.
${originalityRules}

Não copie as notas literalmente: preserve o sentido e desenvolva somente o que elas sustentam. Use HTML (<p>, <h3>, <i>, <strong>, <ul>, <ol>). Crie um título com um hook (gancho) fascinante, elegante e instigante que desperte o desejo imediato de leitura na nossa audiência. O título não deve soar falso ou como "clickbait barato", mas sim como um segredo irresistível sendo compartilhado. O imagePrompt deve ser em inglês, nascer do conceito deste texto e evitar clichês de vinho, café, robe, luxo genérico e mulher diante do espelho.

Além do texto, você DEVE gerar uma sugestão de enquete (suggestedPoll) bem legal, criativa e bem humorada relacionada ao tema do post, e também sugestões de tags (suggestedTagSlugs) no formato slug (ex: pele-madura, autocuidado).
${isEstudei ? "resumoRapido deve resumir o artigo (text) que você acabou de escrever — é a ficha rápida de \"Estudei para te explicar\"." : "Este é um artigo de Papo de Mulher (crônica/relato, não ficha de produto/ativo): devolva todos os campos de resumoRapido como string vazia \"\"."}`;
    const contents = []; 
    if (imagePart) contents.push(imagePart); 
    contents.push(prompt); 
    
    const { response, usage } = await generateAi(ai, "blog", {
      contents,
      config: { responseMimeType: "application/json", responseJsonSchema: postSchema, temperature: 0.85 },
    }); 

    const generated = parseJson<{ title: string; text: string; imagePrompt: string; openingStyle: string; structureStyle: string; closingStyle: string; notablePhrases: string[]; resumoRapido: ResumoRapido; suggestedTagSlugs: string[]; suggestedPoll: { question: string; options: string[] } }>(response.text);
    generated.resumoRapido ||= EMPTY_RESUMO_RAPIDO;
    await recordGeneration(supabase, user.id, { contentType: "blog", topic: `${title || ""} ${category || ""}`, title: generated.title, openingStyle: generated.openingStyle, structureStyle: generated.structureStyle, closingStyle: generated.closingStyle, notablePhrases: generated.notablePhrases, memoryIds: context.memoryIds, usage });
    await suggestMemoryFromNotes(supabase, user.id, impressions, topicTags(title, impressions, category));
    return NextResponse.json(generated);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao gerar postagem" }, { status: 500 });
  } 
}
