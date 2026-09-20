import { NextResponse } from "next/server"; 
import { Resend } from "resend"; 
import { createClient } from "@supabase/supabase-js"; 

export async function POST(req: Request) { 
  try { 
    const authHeader = req.headers.get("Authorization"); 
    if (!authHeader) return NextResponse.json({ error: "Não autorizado" }, { status: 401 }); 
    
    const token = authHeader.replace("Bearer ", ""); 
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); 
    const { data: { user } } = await supabase.auth.getUser(token); 
    
    if (!user) return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 }); 
    
    const resend = new Resend(process.env.RESEND_API_KEY || ""); 
    const { to, subject, text } = await req.json(); 
    
    const data = await resend.emails.send({ 
      from: "Luana <luana@entreluar.com.br>", 
      to, 
      subject, 
      text 
    }); 

    // Salva o e-mail respondido no banco
    await supabase.from("emails").insert([{ 
      sender: `Enviado para: ${to}`, 
      subject: `[RESPOSTA] ${subject}`, 
      body: text 
    }]);

    return NextResponse.json({ success: true, data }); 
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  } 
}
