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
    
    if (!user) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const prompt = `Você é a Luana, mulher madura (50+). Crie um LOTE DE 15 "pílulas de motivação diária" muito curtas (1 a 2 frases cada), impactantes, bem humoradas, acolhedoras ou debochadas sobre a vida da mulher madura, menopausa, skincare ou amor próprio. Nada de clichês cafonas. Tem que ser algo que faça a mulher sorrir, se sentir poderosa ou rir da própria idade tomando um café.

Retorne EXATAMENTE 15 frases. CADA FRASE EM UMA NOVA LINHA. Não coloque números, nem aspas, nem marcadores (bullets). Apenas o texto de cada frase em uma linha separada.`;

    // Utilizando o modelo 1.5-flash que é absurdamente mais barato (quase de graça) para textos
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
