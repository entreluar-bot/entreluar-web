import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { JournalPost, Product, Quote } from "@/app/types";

function escapeIlike(value: string) {
  return value.replace(/[%_]/g, (char) => `\\${char}`);
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 80) || "";
  if (q.length < 2) {
    return NextResponse.json({ query: q, papo: [], estudei: [], vitrine: [], pilulas: [] });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const term = `%${escapeIlike(q)}%`;

  const [{ data: journalRows }, { data: productRows }, { data: quoteRows }] = await Promise.all([
    supabase
      .from("journal")
      .select("id,title,content,image_url,category,created_at")
      .or(`title.ilike.${term},content.ilike.${term}`)
      .order("created_at", { ascending: false })
      .limit(24),
    supabase
      .from("products")
      .select("id,title,description,image_url,price,category,shopee_link,created_at")
      .or(`title.ilike.${term},description.ilike.${term}`)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("quotes").select("id,quote,created_at").ilike("quote", term).order("created_at", { ascending: false }).limit(6),
  ]);

  const journal = (journalRows || []) as JournalPost[];
  const papo = journal.filter((post) => post.category !== "Estudei para te explicar");
  const estudei = journal.filter((post) => post.category === "Estudei para te explicar");
  const vitrine = (productRows || []) as Product[];
  const pilulas = (quoteRows || []) as Quote[];

  return NextResponse.json({ query: q, papo, estudei, vitrine, pilulas });
}
