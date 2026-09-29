import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function clean(value: unknown, max = 100) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const journalId = clean(payload.journalId);
    const voterId = clean(payload.voterId);
    const reaction = payload.reaction === "like" || payload.reaction === "dislike" ? payload.reaction : null;

    if (!journalId || voterId.length < 10) {
      return NextResponse.json({ error: "Não consegui registrar essa reação." }, { status: 400 });
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

    if (reaction) {
      const { error: upsertError } = await supabase
        .from("journal_reactions")
        .upsert([{ journal_id: journalId, voter_id: voterId, reaction, updated_at: new Date().toISOString() }], { onConflict: "journal_id,voter_id" });
      if (upsertError) throw upsertError;
    } else {
      const { error: deleteError } = await supabase
        .from("journal_reactions")
        .delete()
        .eq("journal_id", journalId)
        .eq("voter_id", voterId);
      if (deleteError) throw deleteError;
    }

    const { data: rows } = await supabase.from("journal_reactions").select("reaction").eq("journal_id", journalId);
    const counts = { like: 0, dislike: 0 };
    for (const row of (rows || []) as Array<{ reaction: "like" | "dislike" }>) {
      counts[row.reaction] += 1;
    }

    return NextResponse.json({ counts, myReaction: reaction });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não consegui registrar essa reação.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
