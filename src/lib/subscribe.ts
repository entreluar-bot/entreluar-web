import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "@/lib/welcome-email";

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export function cleanText(value: unknown, max = 240) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

type SubscribeInput = {
  email: string;
  source: string;
  path?: string | null;
  sessionId?: string | null;
  attribution?: Record<string, string | null>;
};

/** Cadastra (ou reativa) o email na newsletter. `created` é true só na primeira vez, quando o email de boas-vindas é enviado. */
export async function subscribeEmail(supabase: SupabaseClient, input: SubscribeInput) {
  const { email, source, path = null, sessionId = null, attribution = {} } = input;
  const subscriberRow = { email, source, signup_path: path, ...attribution };
  const conversionRow = { email, session_id: sessionId, path, source, ...attribution };

  const { error } = await supabase.from("subscribers").insert([subscriberRow]);

  // 23505 é violação de unique no Postgres: o email já estava cadastrado.
  if (error && error.code === "23505") {
    await supabase.from("subscribers").update(subscriberRow).eq("email", email);
    // Quem voltou a se cadastrar volta para a lista (ignora erro se a coluna ainda não existir).
    await supabase.from("subscribers").update({ unsubscribed_at: null }).eq("email", email).not("unsubscribed_at", "is", null);
    await supabase.from("newsletter_conversions").insert([conversionRow]);
    return { created: false, welcomeSent: false };
  }
  if (error) throw error;

  await supabase.from("newsletter_conversions").insert([conversionRow]);
  const welcomeSent = await sendWelcomeEmail(email);
  return { created: true, welcomeSent };
}
