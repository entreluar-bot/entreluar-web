import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, max = 240) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const email = clean(payload.email, 180)?.toLowerCase();

    if (!email || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const attribution = Object.fromEntries(UTM_KEYS.map((key) => [key, clean(payload[key], 120)]));
    const subscriberRow = {
      email,
      source: clean(payload.source, 80) || "site",
      signup_path: clean(payload.path, 400),
      ...attribution,
    };
    const conversionRow = {
      email,
      session_id: clean(payload.sessionId, 80),
      path: clean(payload.path, 400),
      source: clean(payload.source, 80) || "site",
      ...attribution,
    };

    const { error } = await supabase.from("subscribers").insert([subscriberRow]);

    // 23505 is unique violation code in Postgres
    if (error && error.code === "23505") {
      await supabase.from("subscribers").update(subscriberRow).eq("email", email);
      await supabase.from("newsletter_conversions").insert([conversionRow]);
      return NextResponse.json({ message: "Esse email já estava na nossa roda. Atualizei a origem por aqui. ✨" });
    }
    
    if (error) throw error;

    await supabase.from("newsletter_conversions").insert([conversionRow]);
    return NextResponse.json({ success: true, message: "Inscrição confirmada!" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao confirmar inscrição." }, { status: 500 });
  }
}
