import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendCommentNotification } from "@/lib/comment-email";

function getToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

async function getAuthedClient(req: Request) {
  const token = getToken(req);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token) return { error: NextResponse.json({ error: "Não autorizado." }, { status: 401 }) };
  if (!url || !anonKey) return { error: NextResponse.json({ error: "Configuração do Supabase ausente." }, { status: 503 }) };

  const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: { user } } = await authClient.auth.getUser(token);
  if (!user) return { error: NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 }) };

  return {
    supabase: createClient(url, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }),
  };
}

export async function GET(req: Request) {
  try {
    const { supabase, error } = await getAuthedClient(req);
    if (error) return error;

    const columns = "id,journal_id,product_id,email,reader_name,hide_reader_name,body,status,source_path,created_at,approved_at,moderated_at";
    const embeds = "journal:journal_id(title,category),product:product_id(title)";
    const run = (select: string) => supabase!.from("journal_comments").select(select).order("created_at", { ascending: false }).limit(200);
    let { data, error: queryError } = await run(`${columns},author_reply,author_reply_at,${embeds}`);
    // Se a migration das respostas ainda não rodou, carrega sem elas.
    if (queryError) ({ data, error: queryError } = await run(`${columns},${embeds}`));
    if (queryError) throw queryError;
    return NextResponse.json({ comments: data || [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível carregar comentários." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { supabase, error } = await getAuthedClient(req);
    if (error) return error;

    const payload = await req.json() as { id?: string; status?: "approved" | "rejected" | "pending"; reply?: string };
    const hasStatus = payload.status !== undefined;
    const hasReply = typeof payload.reply === "string";
    if (!payload.id || (!hasStatus && !hasReply) || (hasStatus && !["approved", "rejected", "pending"].includes(payload.status || ""))) {
      return NextResponse.json({ error: "Comentário e status ou resposta válidos são obrigatórios." }, { status: 400 });
    }

    const { data: current, error: currentError } = await supabase!.from("journal_comments").select("email,reader_name,status,source_path,author_reply").eq("id", payload.id).single();
    if (currentError || !current) throw currentError || new Error("Comentário não encontrado.");

    const now = new Date().toISOString();
    const update: Record<string, string | null> = {};
    if (hasStatus) {
      update.status = payload.status!;
      update.moderated_at = now;
      update.approved_at = payload.status === "approved" ? now : null;
    }
    const reply = hasReply ? payload.reply!.trim().slice(0, 1500) : null;
    const replyChanged = hasReply && reply !== (current.author_reply || "");
    if (replyChanged) {
      update.author_reply = reply || null;
      update.author_reply_at = reply ? now : null;
    }
    const { error: updateError } = await supabase!.from("journal_comments").update(update).eq("id", payload.id);
    if (updateError) throw updateError;

    // Só avisa por email quem está na lista e não pediu para sair.
    const finalStatus = hasStatus ? payload.status : current.status;
    const justApproved = hasStatus && payload.status === "approved" && current.status !== "approved";
    const newReply = replyChanged && Boolean(reply) && finalStatus === "approved";
    let notified = false;
    if (justApproved || newReply) {
      const { data: subscriber } = await supabase!.from("subscribers").select("email,unsubscribed_at").eq("email", current.email).maybeSingle();
      if (subscriber && !subscriber.unsubscribed_at) {
        notified = await sendCommentNotification({ email: current.email, kind: newReply ? "reply" : "approved", path: current.source_path, readerName: current.reader_name, reply });
      }
    }
    return NextResponse.json({ success: true, notified });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível moderar comentário." }, { status: 500 });
  }
}
