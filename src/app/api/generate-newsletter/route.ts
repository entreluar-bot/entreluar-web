import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { renderPremiumEmail, type NewsletterType } from "@/lib/email-template";

export const maxDuration = 60;

const instructions: Record<NewsletterType, string> = {
  site: "Dê boas-vindas à Entreluar como um espaço seguro e sofisticado para mulheres maduras conversarem sobre beleza, skincare, menopausa e autocuidado com humor. Convide para conhecer a home.",
  blog: "Avise sobre uma nova crônica do Papo de Mulher. Crie curiosidade emocional sem contar tudo e convide para ler a conversa completa no Diário.",
  produto: "Apresente um novo achado da Vitrine como um segredo de beleza contado à melhor amiga. Seja honesta, desejável e concreta, sem promessas exageradas.",
  resenha: "Apresente uma nova análise da série Estudei para te explicar. Valorize a pesquisa, traduza a ciência sem pedantismo e convide para ler a resenha completa.",
  pilula: "Escreva uma carta curta de acolhimento, coragem e autocuidado para a mulher madura. Inclua uma reflexão memorável e convide para conhecer outras pílulas.",
};

type AiEmail = { subject: string; preheader: string; headline: string; bodyHtml: string; ctaText: string; ctaUrl?: string };

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });

    const body = await req.json() as { emailType?: NewsletterType; contextText?: string };
    const emailType: NewsletterType = instructions[body.emailType as NewsletterType] ? body.emailType as NewsletterType : "site";
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const prompt = `Você é Luana, criadora da Entreluar Beauty: uma mulher 50+, elegante, espirituosa, acolhedora e profunda. Você escreve em primeira pessoa como em um áudio carinhoso para uma amiga. Não é casada; tem namorado.

OBJETIVO DESTA CARTA:
${instructions[emailType]}

CONTEXTO DA LUANA:
${body.contextText?.trim() || "Crie uma mensagem original, relevante e delicada."}

REGRAS DE CONTEÚDO:
- Escreva para mulheres maduras, sem infantilizar e sem tratar envelhecimento como defeito.
- Comece o bodyHtml com uma saudação afetuosa; não repita o headline.
- Use 3 a 5 parágrafos curtos, primeira pessoa, profundidade, leve humor e no máximo 2 emojis.
- O texto deve despertar desejo genuíno de visitar o site, sem clickbait barato, urgência falsa ou promessas milagrosas.
- Não inclua assinatura nem botão no bodyHtml; o template acrescentará ambos.
- bodyHtml aceita apenas <p>, <strong>, <em>, <ul>, <li> e <br>.
- ctaUrl deve ser uma URL https específica informada no contexto. Se nenhuma for fornecida, omita o campo.
- Retorne somente JSON válido, sem markdown, nesta estrutura:
{"subject":"até 55 caracteres","preheader":"até 95 caracteres","headline":"frase editorial curta","bodyHtml":"HTML do corpo","ctaText":"2 a 5 palavras","ctaUrl":"opcional"}`;

    const response = await ai.models.generateContent({ model: "gemini-3.6-flash", contents: prompt });
    const raw = (response.text || "").replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();
    const generated = JSON.parse(raw) as AiEmail;
    if (!generated.subject || !generated.preheader || !generated.headline || !generated.bodyHtml || !generated.ctaText) throw new Error("A IA não devolveu todos os campos do e-mail.");
    return NextResponse.json(renderPremiumEmail(emailType, generated));
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao gerar e-mail" }, { status: 500 });
  }
}
