import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    const { data, error: queryError } = await supabase!
      .from("journal_comments")
      .select("id,journal_id,email,body,status,source_path,created_at,approved_at,moderated_at,journal:journal_id(title,category)")
      .order("created_at", { ascending: false })
      .limit(200);
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

    const payload = await req.json() as { id?: string; status?: "approved" | "rejected" | "pending" };
    if (!payload.id || !["approved", "rejected", "pending"].includes(payload.status || "")) {
      return NextResponse.json({ error: "Comentário e status válidos são obrigatórios." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const update = {
      status: payload.status,
      moderated_at: now,
      approved_at: payload.status === "approved" ? now : null,
    };
    const { error: updateError } = await supabase!.from("journal_comments").update(update).eq("id", payload.id);
    if (updateError) throw updateError;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível moderar comentário." }, { status: 500 });
  }
}
