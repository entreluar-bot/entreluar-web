import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Product } from "../types";
import type { Tag } from "@/lib/tags";
import ProductFilters from "./ProductFilters";

export const revalidate = 0;

export default async function Vitrine() {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  const productRows = (data || []) as Product[];
  const productIds = productRows.map((product) => product.id);

  const { data: concernTagRows } = await supabase.from("tags").select("id,name,slug,type").eq("type", "concern");
  const concernTags = (concernTagRows || []) as Tag[];
  const { data: linkRows } = concernTags.length && productIds.length
    ? await supabase.from("content_tags").select("tag_id,content_id").eq("content_type", "product").in("content_id", productIds).in("tag_id", concernTags.map((tag) => tag.id))
    : { data: [] as Array<{ tag_id: string; content_id: string }> };

  const tagBySlug = new Map(concernTags.map((tag) => [tag.id, tag] as const));
  const tagSlugsByProductId = new Map<string, string[]>();
  for (const link of (linkRows || []) as Array<{ tag_id: string; content_id: string }>) {
    const tag = tagBySlug.get(link.tag_id);
    if (!tag) continue;
    tagSlugsByProductId.set(link.content_id, [...(tagSlugsByProductId.get(link.content_id) || []), tag.slug]);
  }

  const products = productRows.map((product) => ({ ...product, tagSlugs: tagSlugsByProductId.get(product.id) || [] }));
  const usedConcernSlugs = new Set(products.flatMap((product) => product.tagSlugs));
  const tagGroups = [
    {
      label: "Quero cuidar de",
      options: concernTags
        .filter((tag) => usedConcernSlugs.has(tag.slug))
        .map((tag) => ({ slug: tag.slug, name: tag.name }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    },
  ];

  return (
    <main className="site-shell">
      <div className="content-wrap">
        <header className="page-intro page-intro--compact">
          <h1 className="section-title">Meus<br /><em>achados</em></h1>
        </header>
        {products.length > 0 ? (
          <ProductFilters products={products} tagGroups={tagGroups} />
        ) : (
          <div className="empty-state">A bancada está respirando. Já já entram novos achados — só os que merecerem espaço. ✨</div>
        )}

        <div className="section-space text-center">
          <Link href="/me-ajuda-a-escolher" className="ghost-button">Não sabe por onde começar? Me ajuda a escolher →</Link>
        </div>
      </div>
    </main>
  );
}
