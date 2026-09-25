import type { SupabaseClient } from "@supabase/supabase-js";
import type { PollData, PollOption } from "@/app/ui/PollWidget";

export async function getActivePollForJournal(supabase: SupabaseClient, journalId: string) {
  const { data: pollRow } = await supabase.from("polls").select("id,question,active").eq("journal_id", journalId).eq("active", true).maybeSingle();
  if (!pollRow) return null;

  const [{ data: optionRows }, { data: voteRows }] = await Promise.all([
    supabase.from("poll_options").select("id,label,position").eq("poll_id", pollRow.id).order("position", { ascending: true }),
    supabase.from("poll_votes").select("option_id").eq("poll_id", pollRow.id),
  ]);

  const options = (optionRows || []) as PollOption[];
  if (!options.length) return null;

  const counts: Record<string, number> = {};
  for (const row of (voteRows || []) as Array<{ option_id: string }>) {
    counts[row.option_id] = (counts[row.option_id] || 0) + 1;
  }

  return { poll: { id: pollRow.id, question: pollRow.question } as PollData, options, counts };
}
