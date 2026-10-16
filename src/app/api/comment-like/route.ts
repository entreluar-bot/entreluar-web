import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimited, clientIp } from "@/lib/rate-limit";

function clean(value: unknown, max = 100) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  if (rateLimited(`comment-like:${clientIp(req)}`, 60, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Calma, amiga. Tenta de novo em alguns minutos." }, { status: 429 });
  }
  try {
    const payload = await req.json();
    const commentId = clean(payload.commentId);
    const voterId = clean(payload.voterId);
    if (!commentId || voterId.length < 10) return NextResponse.json({ error: "Não consegui registrar." }, { status: 400 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    if (payload.liked) {
      const { error } = await supabase.from("comment_likes").upsert([{ comment_id: commentId, voter_id: voterId }], { onConflict: "comment_id,voter_id", ignoreDuplicates: true });
      if (error) throw error;
    } else {
      const { error } = await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("voter_id", voterId);
      if (error) throw error;
    }
    const { count } = await supabase.from("comment_likes").select("id", { count: "exact", head: true }).eq("comment_id", commentId);
    return NextResponse.json({ count: count ?? 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não consegui registrar." }, { status: 500 });
  }
}
