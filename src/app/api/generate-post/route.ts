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
    const body = await req.json(); 
    
    if (body.action === "brainstorm") { 
      const prompt = `Você é a Luana, mulher madura (50+) e criadora da Entreluar Beauty. Gere 3 ideias de temas/títulos BEM humorados, polemicos, íntimos ou desabafos sobre menopausa, autocuidado da pele madura, ou vida de mulher, para a coluna do seu Diário. Não use markdown. Ex: 1. A libertação que é parar de tingir o cabelo e focar no colágeno.`; 
      const response = await ai.models.generateContent({ 
        model: "gemini-3.6-flash", 
        contents: prompt 
      }); 
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
    
    const prompt = `Você é a Luana, criadora da Entreluar Beauty. IMPORTANTE SOBRE A LUANA: ELA NÃO É CASADA (NÃO FALE DE MARIDO), ELA NAMORA (TEM UM NAMORADO). Escreva um artigo completo para a categoria "${category || "Diário"}" do seu blog. Tema sugerido: "${title || "Crônica de uma mulher madura"}". NOTAS PESSOAIS DA LUANA: "${impressions || "Dê sua visão pessoal."}" ATENÇÃO: NÃO copie as notas pessoais exatamente como foram escritas! A Luana apenas jogou ali alguns fatos soltos. O seu dever é DIGERIR esses fatos e reescrevê-los de forma super envolvente, com humor e profundidade, como se você estivesse contando isso para uma amiga num áudio. Use tags HTML ESTRITAS (<p>, <h3> com emojis, <i>, <strong>, <ul>, <ol>). Sem crases no início e no fim. Escreva em PRIMEIRA PESSOA. Retorne ESTRITAMENTE UM JSON VÁLIDO sem formatação markdown com os seguintes campos: { "title": "CRIE UM TÍTULO INCRÍVEL E CRIATIVO AQUI PARA O POST", "text": "texto HTML", "imagePrompt": "A highly detailed, realistic cinematic photograph of [descrição em inglês de uma cena acolhedora, madura e estética (sem pessoas mostrando o rosto de perto) que ilustre a vibe deste texto]" }`; 
    const contents = []; 
    if (imagePart) contents.push(imagePart); 
    contents.push(prompt); 
    
    const response = await ai.models.generateContent({ 
      model: "gemini-3.6-flash", 
      contents
    }); 
    
    let text = response.text || ""; 
    text = text.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim(); 
    return NextResponse.json(JSON.parse(text)); 
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  } 
}
