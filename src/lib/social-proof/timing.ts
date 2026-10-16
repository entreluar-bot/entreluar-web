import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommentIntent } from "./personas";

const MIN_OFFSET_MS = 35 * 60 * 1000; // 35 min após a postagem
const MAX_WINDOW_MS = 21 * 24 * 60 * 60 * 1000; // janela máxima de 21 dias após o post

export function isFuturePostDate(postCreatedAt: string | Date, now: Date = new Date()): boolean {
  const postTime = new Date(postCreatedAt).getTime();
  if (Number.isNaN(postTime)) return false;
  // Tolerância de 5 minutos para pequenas diferenças de relógio
  return postTime > now.getTime() + 5 * 60 * 1000;
}

/**
 * Gera uma data realista SEMPRE posterior à publicação do post e nunca no futuro.
 * Concentra ~70% dos comentários nas primeiras 72h após o post (salvo quando a intenção é 'chegou_atrasada').
 */
export function generateSafeCommentDate(
  postCreatedAt: string | Date,
  intent?: CommentIntent,
  now: Date = new Date(),
  rng: () => number = Math.random,
): string {
  const nowMs = now.getTime();
  const parsedPostMs = new Date(postCreatedAt).getTime();
  const postMs = Number.isNaN(parsedPostMs) ? nowMs - 3600_000 : Math.min(parsedPostMs, nowMs);

  const availableSpan = Math.max(0, nowMs - postMs);
  if (availableSpan <= MIN_OFFSET_MS) {
    // Post acabou de sair: distribui entre +2 min e o instante atual
    const minRecent = Math.min(availableSpan, 2 * 60 * 1000);
    const offset = minRecent + rng() * Math.max(1000, availableSpan - minRecent);
    return new Date(Math.min(nowMs, postMs + offset)).toISOString();
  }

  const effectiveWindow = Math.min(availableSpan, MAX_WINDOW_MS);
  const first72h = Math.min(effectiveWindow, 72 * 3600 * 1000);

  let offsetMs: number;
  if (intent === "chegou_atrasada" && effectiveWindow > first72h) {
    // Leitora atrasada entra na metade final da janela
    offsetMs = first72h + rng() * (effectiveWindow - first72h);
  } else if (rng() < 0.72) {
    // Maioria entra nas primeiras 72h (curva mais densa no início)
    offsetMs = MIN_OFFSET_MS + Math.pow(rng(), 1.4) * Math.max(MIN_OFFSET_MS, first72h - MIN_OFFSET_MS);
  } else {
    offsetMs = MIN_OFFSET_MS + rng() * Math.max(MIN_OFFSET_MS, effectiveWindow - MIN_OFFSET_MS);
  }

  const candidate = new Date(Math.min(nowMs, Math.max(postMs + 60_000, postMs + offsetMs)));
  return candidate.toISOString();
}

/**
 * Garante para exibição que nenhum comentário apareça com data anterior à publicação do post.
 */
export function clampCommentDisplayDate(commentCreatedAt: string, postCreatedAt?: string | null): string {
  if (!postCreatedAt) return commentCreatedAt;
  const commentMs = new Date(commentCreatedAt).getTime();
  const postMs = new Date(postCreatedAt).getTime();
  if (Number.isNaN(commentMs) || Number.isNaN(postMs)) return commentCreatedAt;
  return commentMs < postMs ? postCreatedAt : commentCreatedAt;
}

/**
 * Proporção variável de reações (2x a 5x os comentários) para evitar o padrão fixo de 3x.
 */
export function generateReactionCounts(
  commentCount: number,
  rng: () => number = Math.random,
): { likes: number; dislikes: number } {
  if (commentCount <= 0) return { likes: 0, dislikes: 0 };
  const multiplier = 2 + rng() * 2.8; // 2.0x a 4.8x
  const total = Math.max(commentCount * 2, Math.round(commentCount * multiplier));
  const dislikeRatio = rng() < 0.25 ? 0 : 0.03 + rng() * 0.07;
  const dislikes = Math.min(3, Math.round(total * dislikeRatio));
  const likes = Math.max(1, total - dislikes);
  return { likes, dislikes };
}

/**
 * Quando a data de publicação de um post do Diário é editada no painel,
 * desloca automaticamente os comentários de prova social daquele post para que
 * nenhum fique com data anterior à nova publicação (nem no futuro).
 */
export async function shiftSocialProofDatesOnPostEdit(
  supabase: SupabaseClient,
  journalId: string,
  newPostCreatedAtIso: string,
): Promise<number> {
  const newPostMs = new Date(newPostCreatedAtIso).getTime();
  if (Number.isNaN(newPostMs)) return 0;

  const { data: rows, error } = await supabase
    .from("journal_comments")
    .select("id,created_at,approved_at,status")
    .eq("journal_id", journalId);

  if (error || !rows || rows.length === 0) return 0;

  const nowMs = Date.now();
  let updatedCount = 0;

  for (const row of rows) {
    const createdMs = new Date(row.created_at).getTime();
    const approvedMs = row.approved_at ? new Date(row.approved_at).getTime() : null;
    const isSocialProofPattern =
      row.status === "approved" && approvedMs !== null && Math.abs(approvedMs - createdMs) < 2000;

    if (!isSocialProofPattern && createdMs >= newPostMs) continue;
    if (createdMs >= newPostMs) continue;

    // Reposiciona para depois da nova data do post mantendo espaçamento natural
    const safeCeiling = Math.max(newPostMs + 3600_000, Math.min(nowMs, newPostMs + 7 * 86400_000));
    const newCommentIso = new Date(
      newPostMs + 1800_000 + Math.random() * Math.max(600_000, safeCeiling - newPostMs - 1800_000),
    ).toISOString();

    const updatePayload: Record<string, string> = { created_at: newCommentIso };
    if (isSocialProofPattern) {
      updatePayload.approved_at = newCommentIso;
    }

    const { error: upErr } = await supabase
      .from("journal_comments")
      .update(updatePayload)
      .eq("id", row.id);
    if (!upErr) updatedCount++;
  }

  return updatedCount;
}
