import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { renderPremiumEmail, type NewsletterType } from "@/lib/email-template";
import { applyUnsubscribe, unsubscribeHeaders } from "@/lib/unsubscribe";

export const maxDuration = 60;
const FROM = "Luana <luana@entreluar.com.br>";
type Kind = "cronica" | "estudei" | "vitrine";

async function context(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !url || !anon || !serviceKey) return null;
  const auth = createClient(url, anon, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await auth.auth.getUser(token);
  if (!user) return null;
  const { data: admin } = await auth.from("admin_profiles").select("id").eq("id", user.id).maybeSingle();
  if (!admin) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function config(kind: Kind, id: string) {
  if (kind === "cronica") return { contentType: "journal", emailType: "blog" as NewsletterType, ctaText: "Ler a crônica completa", ctaUrl: `https://entreluar.com.br/blog/${id}` };
  if (kind === "estudei") return { contentType: "journal", emailType: "resenha" as NewsletterType, ctaText: "Dar minha opinião", ctaUrl: `https://entreluar.com.br/resenhas/${id}#conversation-circle-title` };
  return { contentType: "product", emailType: "produto" as NewsletterType, ctaText: "Conhecer o achado", ctaUrl: `https://entreluar.com.br/vitrine/${id}` };
}

async function dispatch(service: any, automationId: string) {
  const { data: automation } = await service.from("publication_email_automations").select("*").eq("id", automationId).single() as { data: any };
  if (!automation) throw new Error("Automação não encontrada.");
  const { data: subscribers } = await service.from("subscribers").select("email").is("unsubscribed_at", null).is("email_paused_at", null);
  const emails = [...new Set((subscribers || []).map((row: { email: string }) => row.email?.trim().toLowerCase()).filter(Boolean))];
  if (emails.length) await service.from("publication_email_deliveries").upsert(emails.map((email) => ({ automation_id: automationId, email })), { onConflict: "automation_id,email", ignoreDuplicates: true });
  const { data: pending } = await service.from("publication_email_deliveries").select("id,email").eq("automation_id", automationId).in("status", ["pending", "failed"]);
  if (!pending?.length) return { accepted: 0, failed: 0, skipped: emails.length };
  const apiKey = process.env.RESEND_API_KEY; if (!apiKey) throw new Error("RESEND_API_KEY não está configurada.");
  await service.from("publication_email_automations").update({ status: "sending", last_error: null, updated_at: new Date().toISOString() }).eq("id", automationId);
  const emailType = automation.content_type === "product" ? "produto" : automation.cta_text === "Dar minha opinião" ? "resenha" : "blog";
  const { subject, html } = renderPremiumEmail(emailType, {
    subject: automation.subject,
    preheader: automation.preheader,
    headline: automation.headline,
    bodyHtml: automation.body_html,
    ctaText: automation.cta_text,
    ctaUrl: automation.cta_url,
  });
  const resend = new Resend(apiKey); let accepted = 0; let failed = 0; let lastError = "";
  for (const row of pending as Array<{ id: string; email: string }>) {
    const response = await resend.emails.send({ from: FROM, to: [row.email], replyTo: "luana@entreluar.com.br", subject, html: applyUnsubscribe(html, row.email), headers: unsubscribeHeaders(row.email) }, { idempotencyKey: `publication-${automationId}-${row.email}` });
    if (response.error) { failed += 1; lastError = response.error.message; await service.from("publication_email_deliveries").update({ status: "failed", error_message: response.error.message, updated_at: new Date().toISOString() }).eq("id", row.id); }
    else { accepted += 1; await service.from("publication_email_deliveries").update({ status: "sent", provider_id: response.data?.id || null, error_message: null, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", row.id); }
  }
  const status = failed === 0 ? "sent" : accepted > 0 ? "partial" : "failed";
  await service.from("publication_email_automations").update({ status, last_error: lastError || null, sent_at: accepted ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", automationId);
  return { accepted, failed, skipped: emails.length - pending.length };
}

export async function GET(request: Request) {
  const service = await context(request); if (!service) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { data, error } = await service.from("publication_email_automations").select("id,content_type,content_id,subject,headline,cta_text,status,last_error,created_at,sent_at,publication_email_deliveries(status)").order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ automations: data || [] });
}

export async function POST(request: Request) {
  const service = await context(request); if (!service) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const body = await request.json().catch(() => null) as { action?: "send" | "retry"; kind?: Kind; contentId?: string; subject?: string; preheader?: string; headline?: string; bodyHtml?: string; automationId?: string } | null;
  try {
    let automationId = body?.automationId || "";
    if (body?.action !== "retry") {
      if (!body?.kind || !body.contentId || !body.subject?.trim() || !body.preheader?.trim() || !body.headline?.trim() || !body.bodyHtml?.trim()) return NextResponse.json({ error: "Rascunho de e-mail incompleto." }, { status: 400 });
      const email = config(body.kind, body.contentId);
      const { data, error } = await service.from("publication_email_automations").upsert({ content_type: email.contentType, content_id: body.contentId, subject: body.subject.trim(), preheader: body.preheader.trim(), headline: body.headline.trim(), body_html: body.bodyHtml.trim(), cta_text: email.ctaText, cta_url: email.ctaUrl, updated_at: new Date().toISOString() }, { onConflict: "content_type,content_id" }).select("id").single();
      if (error) throw error; automationId = data.id;
    }
    if (!automationId) return NextResponse.json({ error: "Automação inválida." }, { status: 400 });
    const result = await dispatch(service, automationId);
    return NextResponse.json({ automationId, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha no envio automático." }, { status: 500 });
  }
}
