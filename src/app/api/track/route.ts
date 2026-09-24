import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

function clean(value: unknown, max = 240) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configuração do Supabase ausente.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const sessionId = clean(payload.sessionId, 80);
    const path = clean(payload.path, 400);
    if (!sessionId || !path) return NextResponse.json({ ok: true });

    const userAgent = clean(req.headers.get("user-agent"), 500);
    const supabase = createSupabaseClient();
    const { error } = await supabase.from("site_visits").insert([{
      session_id: sessionId,
      path,
      title: clean(payload.title, 180),
      referrer: clean(payload.referrer, 500),
      user_agent: userAgent,
      device_type: clean(payload.deviceType, 40),
      ...Object.fromEntries(UTM_KEYS.map((key) => [key, clean(payload[key], 120)])),
    }]);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
