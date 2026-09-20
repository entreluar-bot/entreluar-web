import { NextResponse } from "next/server"; 
import { GoogleGenAI } from "@google/genai"; 
import { createClient } from "@supabase/supabase-js"; 

export const maxDuration = 60; 

export async function POST(req: Request) { 
  try { 
    const authHeader = req.headers.get("Authorization"); 
    if (!authHeader) return NextResponse.json({ error: "Não autorizado" }, { status: 401 }); 
    
    const token = authHeader.replace("Bearer ", ""); 
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); 
    const { data: { user } } = await supabase.auth.getUser(token); 
    
    if (!user) return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 }); 
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" }); 
    const { emailType, contextText } = await req.json(); 
    
    let typeInstructions = "";
    if (emailType === "site") {
      typeInstructions = "O objetivo do e-mail é apresentar o site Entreluar Beauty, dar as boas vindas, falar sobre como aqui é um espaço seguro para mulheres maduras falarem de beleza, skincare e menopausa com humor.";
    } else if (emailType === "blog") {
      typeInstructions = "O objetivo do e-mail é avisar que tem uma nova Crônica / Relato no Diário 'Papo de Mulher'. Faça um suspense gostoso sobre o tema e convide a leitora a clicar no link para ler a fofoca inteira no site.";
    } else if (emailType === "produto") {
      typeInstructions = "O objetivo do e-mail é avisar que você encontrou um produto incrível (um novo achadinho) e postou lá na Vitrine do site. Descreva como se estivesse contando um segredo de beleza para a sua melhor amiga.";
    }
    
    const prompt = `Você é a Luana, criadora da Entreluar Beauty, mulher madura (50+), elegante, acolhedora, com bom humor. IMPORTANTE: ELA NÃO É CASADA. ELA TEM UM NAMORADO. 
Sua tarefa é escrever um E-MAIL MARKETING para suas assinantes. 
Instrução específica: ${typeInstructions}
Notas ou Contexto adicional da Luana: "${contextText || "Crie algo criativo."}"

REGRAS:
- Escreva em primeira pessoa, tom de áudio do WhatsApp, super íntimo.
- O e-mail deve começar com uma saudação afetuosa.
- O e-mail precisa terminar com uma despedida calorosa e a sua assinatura "Luana ✨".
- Use emojis com moderação, mas use.
- Use tags HTML ESTRITAS (<p>, <strong>, <i>, <ul>, <br>, <a>). 
- Para links genéricos para o site, use: <a href="https://entreluar.com.br" style="color: #d4af37; font-weight: bold; text-decoration: underline;">Clique aqui para acessar o site</a> (ou mude o texto do link como quiser, mas mantenha a cor dourada #d4af37).
- Retorne ESTRITAMENTE UM JSON VÁLIDO sem formatação markdown com os campos: 
{ "subject": "Assunto do E-mail SUPER Cativante e Curto", "html": "Corpo do e-mail em HTML" }`; 
    
    const response = await ai.models.generateContent({ 
      model: "gemini-3.6-flash", 
      contents: prompt
    }); 
    
    let text = response.text || ""; 
    text = text.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim(); 
    return NextResponse.json(JSON.parse(text)); 
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  } 
}
