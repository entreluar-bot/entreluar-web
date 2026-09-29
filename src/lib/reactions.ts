import type { SupabaseClient } from "@supabase/supabase-js";

export type ReactionCounts = { like: number; dislike: number };

export async function getReactionsForJournal(supabase: SupabaseClient, journalId: string): Promise<ReactionCounts> {
  const { data: rows } = await supabase.from("journal_reactions").select("reaction").eq("journal_id", journalId);
  const counts: ReactionCounts = { like: 0, dislike: 0 };
  for (const row of (rows || []) as Array<{ reaction: "like" | "dislike" }>) {
    counts[row.reaction] += 1;
  }
  return counts;
}
