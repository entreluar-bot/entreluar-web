import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { JournalPost, Product, Quote } from "@/app/types";

function escapeIlike(value: string) {
  return value.replace(/[%_]/g, (char) => `\\${char}`);
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 80) || "";
  if (q.length < 2) {
    return NextResponse.json({ query: q, papo: [], estudei: [], vitrine: [], pilulas: [] });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const term = `%${escapeIlike(q)}%`;

  const [{ data: journalRows }, { data: productRows }, { data: quoteRows }, { data: matchedTags }] = await Promise.all([
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
    supabase.from("tags").select("id").or(`name.ilike.${term},slug.ilike.${term}`).limit(20),
  ]);
  // A busca continua funcionando durante a janela entre o deploy do código e
  // a execução da migration que cria search_keywords.
  const [{ data: keywordJournals }, { data: keywordProducts }] = await Promise.all([
    supabase.from("journal").select("id,title,content,image_url,category,created_at").contains("search_keywords", [q.toLowerCase()]).limit(24),
    supabase.from("products").select("id,title,description,image_url,price,category,shopee_link,created_at").contains("search_keywords", [q.toLowerCase()]).limit(12),
  ]);

  const tagIds = (matchedTags || []).map((tag) => tag.id);
  const { data: links } = tagIds.length
    ? await supabase.from("content_tags").select("content_type,content_id").in("tag_id", tagIds)
    : { data: [] as Array<{ content_type: "journal" | "product"; content_id: string }> };
  const journalTagIds = (links || []).filter((link) => link.content_type === "journal").map((link) => link.content_id);
  const productTagIds = (links || []).filter((link) => link.content_type === "product").map((link) => link.content_id);
  const [{ data: taggedJournals }, { data: taggedProducts }] = await Promise.all([
    journalTagIds.length ? supabase.from("journal").select("id,title,content,image_url,category,created_at").in("id", journalTagIds).limit(24) : Promise.resolve({ data: [] }),
    productTagIds.length ? supabase.from("products").select("id,title,description,image_url,price,category,shopee_link,created_at").in("id", productTagIds).limit(12) : Promise.resolve({ data: [] }),
  ]);

  const journal = uniqueById([...(journalRows || []), ...(keywordJournals || []), ...(taggedJournals || [])] as JournalPost[]);
  const papo = journal.filter((post) => post.category !== "Estudei para te explicar");
  const estudei = journal.filter((post) => post.category === "Estudei para te explicar");
  const vitrine = uniqueById([...(productRows || []), ...(keywordProducts || []), ...(taggedProducts || [])] as Product[]);
  const pilulas = (quoteRows || []) as Quote[];

  return NextResponse.json({ query: q, papo, estudei, vitrine, pilulas });
}
