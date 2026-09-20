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
    
    const { title, link, impressions, imageUrl, isAccessory } = await req.json(); 
    let imagePart = null; 
    
    if (imageUrl && imageUrl.startsWith("http")) { 
      const imgRes = await fetch(imageUrl); 
      const arrayBuffer = await imgRes.arrayBuffer(); 
      const buffer = Buffer.from(arrayBuffer); 
      const mimeType = imgRes.headers.get("content-type") || "image/jpeg"; 
      imagePart = { inlineData: { data: buffer.toString("base64"), mimeType } }; 
    } 
    
    let prompt = "";

    if (isAccessory) {
      prompt = `Você é a Luana, criadora da Entreluar Beauty, mulher madura, elegante, acolhedora e com bom humor. IMPORTANTE: ELA NÃO É CASADA (tem namorado, mas não precisa citar ele agora).
      Produto fornecido (Roupa/Acessório/Item de Estilo): "${title || "Descubra pela imagem"}". Link de compra: ${link}
      NOTAS PESSOAIS DA LUANA: "${impressions || "Dê sua opinião sincera."}"
      ATENÇÃO: Digerir e reescrever as notas pessoais em primeira pessoa, dando um tom super chique, descontraído e de amiga que dá dicas de estilo.
      NÃO FALE DE CIÊNCIA, ATIVOS OU PELE. ESTE É UM PRODUTO DE ESTILO/USO PESSOAL.
      
      TAREFA 1: Analise a imagem para descobrir o NOME DO PRODUTO e a marca.
      TAREFA 2: Crie a "productReview" (A Vitrine). Foque em estilo, charme, autoestima, elegância, e no motivo pelo qual você recomenda. Seja breve e use EMOJIS. NÃO coloque links no final da review.
      
      Retorne ESTRITAMENTE UM JSON VÁLIDO sem formatação markdown:
      { "productName": "nome exato", "productReview": "texto da vitrine", "blogTitle": "", "blogPost": "" }`;
    } else {
      prompt = `Você é a Luana, criadora da Entreluar Beauty, mulher madura, elegante, acolhedora, com bom humor e autoridade científica. IMPORTANTE SOBRE A LUANA: ELA NÃO É CASADA. ELA TEM UM NAMORADO, MAS NÃO CITE ELE TODA HORA! Varie muito as histórias: fale de conversas com amigas, de viagens, da academia, de estar relaxando no sofá assistindo série, de tomar um vinho, etc. SEJA EXTREMAMENTE CRIATIVA E NUNCA REPETITIVA. NÃO repita a fórmula de 'rotina noturna' sempre. Você escreve SEUS PRÓPRIOS textos em PRIMEIRA PESSOA ("eu uso", "minha pele"). 
      Produto fornecido (se houver): "${title || "Descubra pela imagem"}". Link de compra: ${link} 
      NOTAS PESSOAIS DA LUANA SOBRE O PRODUTO: "${impressions || "Dê sua opinião sincera de amiga."}" 
      ATENÇÃO: NÃO copie as notas pessoais exatamente como foram escritas! A Luana apenas jogou ali alguns fatos e ideias soltas. O seu dever é DIGERIR esses fatos e reescrevê-los lindamente dentro do relato, dando aquele tom pessoal, bem humorado e de amiga confidencial. 
      TAREFA 1: Analise a imagem para descobrir o NOME DO PRODUTO e a marca. 
      TAREFA 2: Pesquise (Google) a ciência por trás deste produto/ativo. 
      TAREFA 3: Crie a "productReview" (A Vitrine). Seja BREVE e fluida (sem tópicos). Inclua a história/nota pessoal transformada em um relato natural seu. Use EMOJIS. Encerre com: <br><br><a href="/blog" class="text-[var(--color-gold)] underline">Quer entender a mágica por trás desse ativo? Vem ler a minha coluna "Estudei para te explicar" no Diário!</a> 
      TAREFA 4: Crie o "blogPost" (Diário) - Coluna "Estudei para te explicar". Use HTML (<p>, <h3>, <i>, <strong>). Inclua as notas pessoais transformadas de forma natural no meio do relato. Use emojis divertidos antes de cada <h3>. Estrutura: <i>(Frase inspiradora)</i>; <h3>[Emoji] A Promessa da Indústria</h3>; <h3>[Emoji] Afinal, o que é isso?</h3>; <h3>[Emoji] E a nossa pele madura, ganha o que com isso?</h3>; <h3>[Emoji] Manual de Sobrevivência</h3>; <h3>[Emoji] É hype ou é milagre?</h3> (inclua seu relato aqui). Encerramento: <br><br>Ficou curiosa para testar esses efeitos maravilhosos na sua pele? Eu deixei o link da minha lojinha de confiança aqui embaixo:<br><br><a href="${link}" target="_blank" class="text-[var(--color-gold)] font-bold underline">✨ Quero garantir a indicação da Luana!</a> 
      Retorne ESTRITAMENTE UM JSON VÁLIDO sem formatação markdown (\`\`\`json): 
      { "productName": "nome exato", "productReview": "texto da vitrine", "blogTitle": "Estudei para te explicar: A verdade sobre o [Nome do Ativo]", "blogPost": "texto HTML" }`;
    }
    
    const contents = []; 
    if (imagePart) contents.push(imagePart); 
    contents.push(prompt); 
    
    const response = await ai.models.generateContent({ 
      model: "gemini-3.6-flash", 
      contents 
    }); 
    
    let text = response.text || "{}"; 
    text = text.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim(); 
    return NextResponse.json(JSON.parse(text)); 
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  } 
}
