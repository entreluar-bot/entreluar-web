import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { JournalPost, Product } from "@/app/types";

type ContentTagLink = { tag_id: string; content_type: "journal" | "product"; content_id: string };

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug")?.trim().slice(0, 80) || "";
  if (!slug) return NextResponse.json({ error: "slug obrigatório" }, { status: 400 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const { data: tagRow } = await supabase.from("tags").select("id,name,slug").eq("slug", slug).maybeSingle();
  if (!tagRow) return NextResponse.json({ tag: null, papo: [], estudei: [], vitrine: [] });

  const { data: linkRows } = await supabase.from("content_tags").select("content_type,content_id").eq("tag_id", tagRow.id);
  const links = (linkRows || []) as ContentTagLink[];
  const journalIds = links.filter((link) => link.content_type === "journal").map((link) => link.content_id);
  const productIds = links.filter((link) => link.content_type === "product").map((link) => link.content_id);

  const [journalResult, productResult] = await Promise.all([
    journalIds.length ? supabase.from("journal").select("*").in("id", journalIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] as JournalPost[] }),
    productIds.length ? supabase.from("products").select("*").in("id", productIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] as Product[] }),
  ]);

  const journal = (journalResult.data || []) as JournalPost[];
  const papo = journal.filter((post) => post.category !== "Estudei para te explicar");
  const estudei = journal.filter((post) => post.category === "Estudei para te explicar");
  const vitrine = (productResult.data || []) as Product[];

  return NextResponse.json({ tag: { name: tagRow.name, slug: tagRow.slug }, papo, estudei, vitrine });
}
