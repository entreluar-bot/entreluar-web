import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const FROM = "Luana <luana@entreluar.com.br>";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DeliveryError = { batch: number; failed: number; message: string };

type EmailHistoryRow = {
  id?: string;
  sender: string;
  subject: string;
  body: string;
  created_at?: string;
};

function sanitizeProviderError(message?: string) {
  if (!message) return "O provedor recusou este lote.";
  return message.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[destinatário]").slice(0, 240);
}

function normalizeEmails(rows: Array<{ email: unknown }>) {
  const unique = new Set<string>();
  let invalid = 0;
  let duplicates = 0;

  for (const row of rows) {
    const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
    if (!EMAIL_PATTERN.test(email)) invalid += 1;
    else if (unique.has(email)) duplicates += 1;
    else unique.add(email);
  }

  return { emails: [...unique], invalid, duplicates, total: rows.length };
}

async function contentFingerprint(subject: string, html: string) {
  const content = new TextEncoder().encode(`${subject.trim().toLowerCase()}\n${html.trim()}`);
  const digest = await crypto.subtle.digest("SHA-256", content);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function recipientFromSender(sender: string) {
  const match = sender.match(/^Enviado para:\s*(.+)$/i);
  return match?.[1]?.trim().toLowerCase() || null;
}

function fingerprintFromBody(body: string) {
  return body.match(/fingerprint:([a-f0-9]{64})/)?.[1] || null;
}

async function getAuthenticatedContext(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Configuração do Supabase ausente no servidor.");

  const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) return null;

  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function getRecipients(req: Request) {
  const supabase = await getAuthenticatedContext(req);
  if (!supabase) return { unauthorized: true as const };
  const { data, error } = await supabase.from("subscribers").select("email");
  if (error) throw new Error("Não foi possível acessar a base de assinantes.");
  return {
    unauthorized: false as const,
    supabase,
    recipients: normalizeEmails((data ?? []) as Array<{ email: unknown }>),
  };
}

export async function GET(req: Request) {
  try {
    const result = await getRecipients(req);
    if (result.unauthorized) return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
    const { data: historyData, error: historyError } = await result.supabase
      .from("emails")
      .select("id,sender,subject,body,created_at")
      .order("created_at", { ascending: false });
    if (historyError) throw new Error("Não foi possível acessar o histórico de envios.");

    const deliveries = ((historyData ?? []) as EmailHistoryRow[])
      .map((item) => {
        const recipient = recipientFromSender(item.sender);
        if (!recipient) return null;
        const type = item.subject.startsWith("[MARKETING]") ? "marketing" : "resposta";
        return {
          id: item.id,
          recipient,
          subject: item.subject.replace(/^\[(MARKETING|RESPOSTA)\]\s*/i, ""),
          body: item.body.replace(/^<!--[^>]*-->/, ""),
          sentAt: item.created_at,
          type,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      requested: result.recipients.emails.length,
      total: result.recipients.total,
      invalid: result.recipients.invalid,
      duplicates: result.recipients.duplicates,
      subscribers: result.recipients.emails,
      deliveries,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao consultar assinantes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "O serviço de e-mail não está configurado no ambiente publicado." }, { status: 503 });

    const result = await getRecipients(req);
    if (result.unauthorized) return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });

    const payload = await req.json() as { subject?: string; html?: string; dispatchId?: string };
    const subject = payload.subject?.trim();
    const html = payload.html?.trim();
    const dispatchId = payload.dispatchId?.trim();
    if (!subject || !html) return NextResponse.json({ error: "Assunto e corpo são obrigatórios." }, { status: 400 });
    if (!dispatchId || !/^[a-zA-Z0-9-]{16,80}$/.test(dispatchId)) return NextResponse.json({ error: "Identificador do disparo inválido." }, { status: 400 });

    const audience = result.recipients.emails;
    if (audience.length === 0) return NextResponse.json({ error: "Não há assinantes válidos para este disparo." }, { status: 400 });

    const fingerprint = await contentFingerprint(subject, html);
    const { data: previousData, error: previousError } = await result.supabase
      .from("emails")
      .select("sender,body")
      .like("subject", "[MARKETING]%");
    if (previousError) {
      return NextResponse.json({ error: "Não foi possível verificar o histórico. O envio foi bloqueado para evitar duplicidades." }, { status: 500 });
    }

    const previouslySent = new Set(
      ((previousData ?? []) as EmailHistoryRow[])
        .filter((item) => fingerprintFromBody(item.body) === fingerprint)
        .map((item) => recipientFromSender(item.sender))
        .filter((email): email is string => Boolean(email)),
    );
    const recipients = audience.filter((email) => !previouslySent.has(email));
    const skipped = audience.length - recipients.length;
    if (recipients.length === 0) {
      return NextResponse.json({
        success: true,
        dispatchId,
        requested: 0,
        accepted: 0,
        failed: 0,
        skipped,
        errors: [],
        message: "Todas as assinantes já receberam este mesmo conteúdo.",
      });
    }

    const resend = new Resend(apiKey);
    const errors: DeliveryError[] = [];
    const acceptedRecipients: string[] = [];
    let accepted = 0;

    for (let start = 0; start < recipients.length; start += 100) {
      const chunk = recipients.slice(start, start + 100);
      const batchNumber = Math.floor(start / 100) + 1;
      try {
        const response = await resend.batch.send(
          chunk.map((email) => ({ from: FROM, to: [email], subject, html })),
          { batchValidation: "permissive", idempotencyKey: `${dispatchId}-batch-${batchNumber}` },
        );

        if (response.error) {
          errors.push({ batch: batchNumber, failed: chunk.length, message: sanitizeProviderError(response.error.message) });
          continue;
        }

        const failedIndexes = new Set(response.data.errors?.map((item) => item.index) ?? []);
        const acceptedInBatch = chunk.filter((_, index) => !failedIndexes.has(index));
        accepted += acceptedInBatch.length;
        acceptedRecipients.push(...acceptedInBatch);
        if (response.data.errors?.length) {
          errors.push({
            batch: batchNumber,
            failed: response.data.errors.length,
            message: sanitizeProviderError(response.data.errors[0]?.message),
          });
        }
      } catch (error) {
        errors.push({
          batch: batchNumber,
          failed: chunk.length,
          message: sanitizeProviderError(error instanceof Error ? error.message : undefined),
        });
      }
    }

    const requested = recipients.length;
    const failed = requested - accepted;
    const success = failed === 0;
    const statusLabel = success ? "CONCLUÍDO" : accepted > 0 ? "PARCIAL" : "FALHOU";

    if (acceptedRecipients.length > 0) {
      const historyBody = `<!-- dispatch:${dispatchId}; fingerprint:${fingerprint}; status:${statusLabel} -->${html}`;
      const { error: historyError } = await result.supabase.from("emails").insert(
        acceptedRecipients.map((email) => ({
          sender: `Enviado para: ${email}`,
          subject: `[MARKETING] ${subject}`,
          body: historyBody,
        })),
      );
      if (historyError) errors.push({ batch: 0, failed: 0, message: "Envio confirmado, mas o histórico não pôde ser salvo." });
    }

    return NextResponse.json({ success, dispatchId, requested, accepted, failed, skipped, errors }, { status: accepted > 0 ? 200 : 502 });
  } catch (error) {
    const message = error instanceof Error ? sanitizeProviderError(error.message) : "Falha inesperada no disparo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
