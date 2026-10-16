import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function setUnsubscribed(email: string, leave: boolean) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("not-configured");

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  // ilike sem curingas: casa o email ignorando maiúsculas; escapa \, % e _.
  const literal = email.replace(/[\\%_]/g, (char) => `\\${char}`);
  const { error } = await supabase
    .from("subscribers")
    .update({ unsubscribed_at: leave ? new Date().toISOString() : null })
    .ilike("email", literal);
  if (error) throw new Error("update-failed");
}

function fail(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "not-configured") {
    return NextResponse.json({ error: "Não consegui concluir agora. Responda o email da Luana pedindo para sair que eu resolvo manualmente." }, { status: 503 });
  }
  return NextResponse.json({ error: "Não consegui concluir agora. Tente de novo em instantes." }, { status: 500 });
}

/** Um clique: usado pelo botão "Cancelar inscrição" do cliente de email (e=…&t=… na URL). */
export async function POST(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    let email = params.get("e") || "";
    let token = params.get("t") || "";
    let leave = true;

    // A página /sair envia JSON; o botão do Gmail envia form-urlencoded sem esses campos.
    if ((req.headers.get("content-type") || "").includes("application/json")) {
      const body = await req.json().catch(() => ({})) as { e?: unknown; t?: unknown; action?: unknown };
      email = typeof body.e === "string" ? body.e : email;
      token = typeof body.t === "string" ? body.t : token;
      leave = body.action !== "return";
    }

    email = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email) || !verifyUnsubscribeToken(email, token)) {
      return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 });
    }

    await setUnsubscribed(email, leave);
    return NextResponse.json({ success: true });
  } catch (error) {
    return fail(error);
  }
}
