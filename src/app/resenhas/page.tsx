import { createClient } from "@/utils/supabase/server";
import type { JournalPost, Product } from "../types";
import type { Tag } from "@/lib/tags";
import ReviewFilters from "./ReviewFilters";

export const revalidate = 0;

export default async function Resenhas() {
  const supabase = await createClient();
  const [{ data: journalData }, { data: productData }] = await Promise.all([
    supabase.from("journal").select("*").eq("category", "Estudei para te explicar").order("created_at", { ascending: false }),
    supabase.from("products").select("image_url,category,is_featured,is_most_purchased,is_most_viewed"),
  ]);

  const highlightsByImage = new Map(
    ((productData || []) as Pick<Product, "image_url" | "category" | "is_featured" | "is_most_purchased" | "is_most_viewed">[])
      .filter((product) => Boolean(product.image_url))
      .map((product) => [product.image_url as string, product]),
  );
  const journalPosts = (journalData || []) as JournalPost[];
  const postIds = journalPosts.map((post) => post.id);

  const [{ data: ingredientTagRows }, { data: concernTagRows }] = await Promise.all([
    supabase.from("tags").select("id,name,slug,type").eq("type", "ingredient"),
    supabase.from("tags").select("id,name,slug,type").eq("type", "concern"),
  ]);
  const allTagRows = [...((ingredientTagRows || []) as Tag[]), ...((concernTagRows || []) as Tag[])];
  const { data: linkRows } = allTagRows.length && postIds.length
    ? await supabase.from("content_tags").select("tag_id,content_id").eq("content_type", "journal").in("content_id", postIds).in("tag_id", allTagRows.map((tag) => tag.id))
    : { data: [] as Array<{ tag_id: string; content_id: string }> };

  const tagBySlug = new Map(allTagRows.map((tag) => [tag.id, tag] as const));
  const tagSlugsByPostId = new Map<string, string[]>();
  for (const link of (linkRows || []) as Array<{ tag_id: string; content_id: string }>) {
    const tag = tagBySlug.get(link.tag_id);
    if (!tag) continue;
    tagSlugsByPostId.set(link.content_id, [...(tagSlugsByPostId.get(link.content_id) || []), tag.slug]);
  }

  const posts = journalPosts.map((post) => {
    const product = post.image_url ? highlightsByImage.get(post.image_url) : undefined;
    return {
      ...post,
      is_featured: product?.is_featured,
      is_most_purchased: product?.is_most_purchased,
      is_most_viewed: product?.is_most_viewed,
      filter_category: product?.category,
      tagSlugs: tagSlugsByPostId.get(post.id) || [],
    };
  });

  const usedIngredientSlugs = new Set(posts.flatMap((post) => post.tagSlugs).filter((slug) => (ingredientTagRows || []).some((tag) => tag.slug === slug)));
  const usedConcernSlugs = new Set(posts.flatMap((post) => post.tagSlugs).filter((slug) => (concernTagRows || []).some((tag) => tag.slug === slug)));
  const tagGroups = [
    {
      label: "Por ativo",
      options: ((ingredientTagRows || []) as Tag[])
        .filter((tag) => usedIngredientSlugs.has(tag.slug))
        .map((tag) => ({ slug: tag.slug, name: tag.name }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    },
    {
      label: "Por queixa",
      options: ((concernTagRows || []) as Tag[])
        .filter((tag) => usedConcernSlugs.has(tag.slug))
        .map((tag) => ({ slug: tag.slug, name: tag.name }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    },
  ];

  return (
    <main className="site-shell">
      <div className="content-wrap">
        <header className="page-intro">
          <p className="eyebrow">Estudei para te explicar</p>
          <h1 className="section-title mt-4">Estudei para<br /><em>te explicar</em></h1>
          <p>Eu estudo os ativos, separo evidência de promessa e te conto o que importa — sem complicar e sem enrolação.</p>
        </header>
        {posts.length ? <ReviewFilters posts={posts} tagGroups={tagGroups} /> : <div className="empty-state">A lupa está trabalhando. Quando a evidência chegar, eu traduzo sem enrolação. 🔬</div>}
      </div>
    </main>
  );
}
