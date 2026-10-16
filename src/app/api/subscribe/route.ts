import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimited, clientIp } from "@/lib/rate-limit";
import { subscribeEmail, UTM_KEYS } from "@/lib/subscribe";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, max = 240) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

export async function POST(req: Request) {
  if (rateLimited(`subscribe:${clientIp(req)}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Muitas tentativas. Espere alguns minutinhos e tente de novo." }, { status: 429 });
  }
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
    const { created, welcomeSent } = await subscribeEmail(supabase, {
      email,
      source: clean(payload.source, 80) || "site",
      path: clean(payload.path, 400),
      sessionId: clean(payload.sessionId, 80),
      attribution,
    });

    if (!created) {
      return NextResponse.json({ message: "Esse email já estava na nossa roda. Atualizei a origem por aqui. ✨" });
    }
    return NextResponse.json({
      success: true,
      message: welcomeSent
        ? "Pronto, amiga! Te mandei o guia por email. Se não aparecer, dá uma olhadinha no spam. ✨"
        : "Inscrição confirmada! Em breve eu te escrevo. ✨",
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao confirmar inscrição." }, { status: 500 });
  }
}
