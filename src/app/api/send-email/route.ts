import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const FROM = "Luana <luana@entreluar.com.br>";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const apiKey = process.env.RESEND_API_KEY;
    if (!url || !anonKey) return NextResponse.json({ error: "Configuração do Supabase ausente." }, { status: 503 });
    if (!apiKey) return NextResponse.json({ error: "O serviço de e-mail não está configurado." }, { status: 503 });

    const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: { user } } = await authClient.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });

    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const payload = await req.json() as { to?: string; subject?: string; text?: string; dispatchId?: string };
    const to = payload.to?.trim().toLowerCase();
    const subject = payload.subject?.trim();
    const text = payload.text?.trim();
    const dispatchId = payload.dispatchId?.trim();

    if (!to || !EMAIL_PATTERN.test(to) || !subject || !text) {
      return NextResponse.json({ error: "Destinatário, assunto e mensagem válidos são obrigatórios." }, { status: 400 });
    }

    const resend = new Resend(apiKey);
    const response = await resend.emails.send(
      { from: FROM, to: [to], subject, text },
      dispatchId ? { idempotencyKey: dispatchId } : undefined,
    );
    if (response.error || !response.data?.id) {
      const message = response.error?.message?.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[destinatário]").slice(0, 240);
      return NextResponse.json({ error: message || "O provedor não aceitou o e-mail." }, { status: 502 });
    }

    const { error: historyError } = await supabase.from("emails").insert([{
      sender: `Enviado para: ${to}`,
      subject: `[RESPOSTA] ${subject}`,
      body: text,
    }]);

    return NextResponse.json({
      success: true,
      id: response.data.id,
      historySaved: !historyError,
      warning: historyError ? "E-mail enviado, mas o histórico não pôde ser salvo." : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada ao enviar o e-mail.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
