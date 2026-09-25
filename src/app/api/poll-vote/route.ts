import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function clean(value: unknown, max = 100) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const pollId = clean(payload.pollId);
    const optionId = clean(payload.optionId);
    const voterId = clean(payload.voterId);

    if (!pollId || !optionId || voterId.length < 10) {
      return NextResponse.json({ error: "Não consegui registrar esse voto." }, { status: 400 });
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

    const { data: option } = await supabase.from("poll_options").select("id,poll_id").eq("id", optionId).eq("poll_id", pollId).maybeSingle();
    if (!option) return NextResponse.json({ error: "Essa opção não existe mais." }, { status: 400 });

    const { error: insertError } = await supabase.from("poll_votes").insert([{ poll_id: pollId, option_id: optionId, voter_id: voterId }]);
    if (insertError && insertError.code !== "23505") throw insertError;

    const { data: voteRows } = await supabase.from("poll_votes").select("option_id").eq("poll_id", pollId);
    const counts: Record<string, number> = {};
    for (const row of (voteRows || []) as Array<{ option_id: string }>) {
      counts[row.option_id] = (counts[row.option_id] || 0) + 1;
    }

    const { data: myVote } = await supabase.from("poll_votes").select("option_id").eq("poll_id", pollId).eq("voter_id", voterId).maybeSingle();

    return NextResponse.json({ counts, votedOptionId: myVote?.option_id || optionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não consegui registrar esse voto.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
