import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FROM = "Entreluar <luana@entreluar.com.br>";
const TO = "luana@entreluar.com.br";

function clean(value: unknown, max = 240) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const postId = clean(payload.postId, 80);
    const postTitle = clean(payload.postTitle, 160) || "Papo de Mulher";
    const email = clean(payload.email, 180).toLowerCase();
    const body = clean(payload.body, 1200);
    const path = clean(payload.path, 400);
    const honeypot = clean(payload.website, 120);

    if (honeypot) return NextResponse.json({ success: true, message: "Recebi seu comentário com carinho. Ele vai aparecer assim que eu aprovar, combinado?" });
    if (!postId || !email || !EMAIL_PATTERN.test(email) || body.length < 8) {
      return NextResponse.json({ error: "Preencha email e comentário com carinho para entrar na roda." }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return NextResponse.json({ error: "A roda de conversa ainda não está configurada." }, { status: 503 });

    const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
    const { error } = await supabase.from("journal_comments").insert([{
      journal_id: postId,
      email,
      body,
      source_path: path,
      status: "pending",
    }]);
    if (error) throw error;

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: FROM,
        to: [TO],
        subject: "Novo comentario para aprovar na Entreluar",
        text: [
          "Luana, chegou uma nova mensagem na roda de conversa.",
          "",
          `Post: ${postTitle}`,
          `Email da leitora: ${email}`,
          path ? `Pagina: ${path}` : "",
          "",
          body,
          "",
          "Entre no painel da Entreluar e abra a aba Comentarios para aprovar ou rejeitar.",
        ].filter(Boolean).join("\n"),
      });
    }

    return NextResponse.json({ success: true, message: "Recebi seu comentário com carinho. Ele vai aparecer assim que eu aprovar, combinado?" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não consegui guardar seu comentário agora.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
