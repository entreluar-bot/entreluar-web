import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { renderPremiumEmail, type NewsletterType } from "@/lib/email-template";
import { authenticateAiRequest } from "@/lib/ai/auth";
import { loadAiContext, parseJson, recordGeneration, topicTags } from "@/lib/ai/context";
import { LUANA_VOICE, SIMPLE_LANGUAGE_RULES, TRUTH_RULES } from "@/lib/ai/identity";
import { newsletterSchema } from "@/lib/ai/schemas";
import { generateAi } from "@/lib/ai/runtime";

export const maxDuration = 60;

const instructions: Record<NewsletterType, string> = {
  site: "Dê boas-vindas à Entreluar como um espaço seguro e sofisticado para mulheres maduras conversarem sobre beleza, skincare, menopausa e autocuidado com humor. Convide para conhecer a home.",
  blog: "Avise sobre uma nova crônica do Papo de Mulher. Crie curiosidade emocional sem contar tudo e convide para ler a conversa completa no Diário.",
  produto: "Apresente um novo achado da Vitrine como um segredo de beleza contado à melhor amiga. Seja honesta, desejável e concreta, sem promessas exageradas.",
  resenha: "Apresente uma nova análise da série Estudei para te explicar. Valorize a pesquisa, traduza a ciência sem pedantismo e convide para ler a resenha completa.",
  pilula: "Escreva uma carta curta de acolhimento, coragem e autocuidado para a mulher madura. Inclua uma reflexão memorável e convide para conhecer outras pílulas.",
};

type AiEmail = { subject: string; preheader: string; headline: string; bodyHtml: string; ctaText: string; ctaUrl: string; openingStyle: string; notablePhrases: string[] };

export async function POST(req: Request) {
  try {
    const { supabase, user } = await authenticateAiRequest(req);

    const body = await req.json() as { emailType?: NewsletterType; contextText?: string };
    const emailType: NewsletterType = instructions[body.emailType as NewsletterType] ? body.emailType as NewsletterType : "site";
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const context = await loadAiContext(supabase, user.id, `newsletter_${emailType}`, topicTags(body.contextText, emailType));
    const prompt = `${LUANA_VOICE}
${TRUTH_RULES}
${SIMPLE_LANGUAGE_RULES}
${context.memoryPrompt}
${context.antiRepetitionPrompt}

OBJETIVO DESTA CARTA:
${instructions[emailType]}

CONTEXTO DA LUANA:
${body.contextText?.trim() || "Crie uma mensagem original, relevante e delicada."}

REGRAS DE CONTEÚDO:
- Escreva para mulheres maduras, sem infantilizar e sem tratar envelhecimento como defeito.
- Varie a abertura entre observação, descoberta, pergunta, opinião ou lembrança verdadeira. Não repita o headline e não obrigue uma saudação.
- Use 3 a 5 parágrafos curtos, primeira pessoa, profundidade, leve humor e no máximo 2 emojis.
- O texto deve despertar desejo genuíno de visitar o site, sem clickbait barato, urgência falsa ou promessas milagrosas.
- Não inclua assinatura nem botão no bodyHtml; o template acrescentará ambos.
- bodyHtml aceita apenas <p>, <strong>, <em>, <ul>, <li> e <br>.
- ctaUrl deve ser a URL https específica informada no contexto; se nenhuma for fornecida, retorne string vazia.
- subject abre uma curiosidade honesta; preheader complementa sem repetir; headline entrega a promessa editorial; CTA descreve o próximo passo.`;

    const { response, usage } = await generateAi(ai, "newsletter", { contents: prompt, config: { responseMimeType: "application/json", responseJsonSchema: newsletterSchema, temperature: 0.8 } });
    const generated = parseJson<AiEmail>(response.text);
    if (!generated.subject || !generated.preheader || !generated.headline || !generated.bodyHtml || !generated.ctaText) throw new Error("A IA não devolveu todos os campos do e-mail.");
    await recordGeneration(supabase, user.id, { contentType: `newsletter_${emailType}`, topic: body.contextText, title: generated.subject, openingStyle: generated.openingStyle, notablePhrases: generated.notablePhrases, memoryIds: context.memoryIds, usage });
    return NextResponse.json(renderPremiumEmail(emailType, generated));
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao gerar e-mail" }, { status: 500 });
  }
}
