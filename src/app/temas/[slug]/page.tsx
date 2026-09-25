import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { THEME_GROUPS } from "@/lib/theme-groups";
import type { Tag } from "@/lib/tags";
import type { JournalPost, Product } from "@/app/types";
import ThemeGroupFilters, { type ThemeItem } from "./ThemeGroupFilters";

export const revalidate = 0;

type ContentTagLink = { tag_id: string; content_type: "journal" | "product"; content_id: string };

export default async function ThemeGroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = THEME_GROUPS.find((item) => item.slug === slug);
  if (!group) notFound();

  const supabase = await createClient();
  const { data: tagRows } = await supabase.from("tags").select("id,name,slug,type").in("slug", group.tagSlugs);
  const tags = (tagRows || []) as Tag[];
  const tagIds = tags.map((tag) => tag.id);

  const linkResult = tagIds.length
    ? await supabase.from("content_tags").select("tag_id,content_type,content_id").in("tag_id", tagIds)
    : { data: [] as ContentTagLink[] };
  const links = (linkResult.data || []) as ContentTagLink[];

  const slugByTagId = new Map(tags.map((tag) => [tag.id, tag.slug]));
  const tagSlugsByContent = new Map<string, string[]>();
  const journalIds = new Set<string>();
  const productIds = new Set<string>();
  for (const link of links) {
    const tagSlug = slugByTagId.get(link.tag_id);
    if (!tagSlug) continue;
    const key = `${link.content_type}:${link.content_id}`;
    tagSlugsByContent.set(key, [...(tagSlugsByContent.get(key) || []), tagSlug]);
    if (link.content_type === "journal") journalIds.add(link.content_id);
    else productIds.add(link.content_id);
  }

  const [journalResult, productResult] = await Promise.all([
    journalIds.size ? supabase.from("journal").select("*").in("id", [...journalIds]) : Promise.resolve({ data: [] as JournalPost[] }),
    productIds.size ? supabase.from("products").select("*").in("id", [...productIds]) : Promise.resolve({ data: [] as Product[] }),
  ]);

  const items: ThemeItem[] = [
    ...((journalResult.data || []) as JournalPost[]).map((post) => ({
      kind: "journal" as const,
      id: post.id,
      tagSlugs: tagSlugsByContent.get(`journal:${post.id}`) || [],
      post,
    })),
    ...((productResult.data || []) as Product[]).map((product) => ({
      kind: "product" as const,
      id: product.id,
      tagSlugs: tagSlugsByContent.get(`product:${product.id}`) || [],
      product,
    })),
  ].sort((a, b) => {
    const dateA = a.kind === "journal" ? a.post.created_at : a.product.created_at || "";
    const dateB = b.kind === "journal" ? b.post.created_at : b.product.created_at || "";
    return (dateB || "").localeCompare(dateA || "");
  });

  const tagOptions = tags
    .filter((tag) => items.some((item) => item.tagSlugs.includes(tag.slug)))
    .map((tag) => ({ slug: tag.slug, name: tag.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <main className="site-shell">
      <div className="content-wrap">
        <header className="page-intro">
          <p className="eyebrow">O que você quer descobrir hoje?</p>
          <h1 className="section-title mt-4">{group.icon} {group.label}</h1>
          <p>{group.subtitle}</p>
        </header>
        <ThemeGroupFilters items={items} tagOptions={tagOptions} />
      </div>
    </main>
  );
}
