import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getToken = (request: Request) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";

async function getAdmin(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { error: "Configuração do Supabase ausente." };
  const token = getToken(request);
  const auth = createClient(url, anonKey, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await auth.auth.getUser(token);
  if (!user) return { error: "Sessão inválida ou expirada." };
  const { data: profile } = await auth.from("admin_profiles").select("id").eq("id", user.id).maybeSingle();
  if (!profile) return { error: "Seu usuário não tem permissão de administrador." };
  return { user, url };
}

export async function GET(request: Request) {
  const context = await getAdmin(request);
  if ("error" in context) return NextResponse.json({ error: context.error }, { status: 401 });
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "A chave de serviço do Supabase não foi configurada." }, { status: 503 });
  const service = createClient(context.url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await service.from("admin_profiles").select("id,email,role,force_password_change,created_at").order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ admins: data || [] });
}

export async function POST(request: Request) {
  const context = await getAdmin(request);
  if ("error" in context) return NextResponse.json({ error: context.error }, { status: 401 });
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "A chave de serviço do Supabase não foi configurada." }, { status: 503 });

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (password.length < 10) return NextResponse.json({ error: "A senha provisória precisa ter ao menos 10 caracteres." }, { status: 400 });

  const service = createClient(context.url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) return NextResponse.json({ error: error?.message || "Não foi possível criar o administrador." }, { status: 400 });
  const { error: profileError } = await service.from("admin_profiles").insert({ id: data.user.id, email, force_password_change: true });
  if (profileError) {
    await service.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  return NextResponse.json({ admin: { id: data.user.id, email, force_password_change: true } }, { status: 201 });
}
