import { NextResponse } from "next/server"; 
import { Resend } from "resend"; 
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
    
    const resend = new Resend(process.env.RESEND_API_KEY || ""); 
    const { subject, html } = await req.json(); 
    
    if (!subject || !html) return NextResponse.json({ error: "Assunto e corpo são obrigatórios." }, { status: 400 });

    // Pega todos os assinantes
    const { data: subscribers, error: subError } = await supabase.from("subscribers").select("email");
    
    if (subError) throw subError;
    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({ error: "Você não tem assinantes ainda!" }, { status: 400 });
    }

    const emails = subscribers.map(s => s.email);
    
    // O Resend Batch permite no máximo 100 emails por requisição.
    const chunkSize = 100;
    const chunks = [];
    for (let i = 0; i < emails.length; i += chunkSize) {
      chunks.push(emails.slice(i, i + chunkSize));
    }

    let successCount = 0;

    for (const chunk of chunks) {
      // Monta os objetos de email individuais
      const batchPayload = chunk.map(email => ({
        from: "Luana <luana@entreluar.com.br>",
        to: [email],
        subject,
        html
      }));

      // Dispara o lote
      await resend.batch.send(batchPayload);
      successCount += chunk.length;
    }

    // Salva o histórico de disparo na tabela emails para controle interno
    await supabase.from("emails").insert([{ 
      sender: "Marketing (luana@entreluar.com.br)", 
      subject: `[DISPARO] ${subject}`, 
      body: html 
    }]);

    return NextResponse.json({ success: true, count: successCount }); 
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  } 
}
