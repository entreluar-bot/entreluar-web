import type { SupabaseClient } from "@supabase/supabase-js";
import type { JournalComment } from "@/app/types";

const BASE_COLUMNS = "id,journal_id,reader_name,hide_reader_name,body,status,created_at,approved_at";
const FULL_COLUMNS = `${BASE_COLUMNS},author_reply,author_reply_at`;

/** Comentários aprovados de um post ou produto. Se a migration das respostas ainda não rodou, cai para as colunas antigas. */
export async function getApprovedComments(supabase: SupabaseClient, target: "journal_id" | "product_id", id: string): Promise<JournalComment[]> {
  const run = (columns: string) =>
    supabase.from("journal_comments").select(columns).eq(target, id).eq("status", "approved").order("created_at", { ascending: false });

  const full = await run(FULL_COLUMNS);
  const rows = full.error ? (await run(BASE_COLUMNS)).data : full.data;
  const comments = (rows || []) as unknown as JournalComment[];
  if (!comments.length) return comments;

  const { data: likeRows, error: likeError } = await supabase.from("comment_likes").select("comment_id").in("comment_id", comments.map((comment) => comment.id));
  if (likeError) return comments;
  const counts = new Map<string, number>();
  for (const row of (likeRows || []) as Array<{ comment_id: string }>) counts.set(row.comment_id, (counts.get(row.comment_id) || 0) + 1);
  return comments.map((comment) => ({ ...comment, likes: counts.get(comment.id) || 0 }));
}
