import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Product } from "../types";
import type { Tag, TagType } from "@/lib/tags";
import ProductFilters from "./ProductFilters";

export const revalidate = 0;

const FILTERABLE_TAG_TYPES: TagType[] = ["concern", "routine_step", "usage_period"];
const FILTER_GROUP_LABELS: Partial<Record<TagType, string>> = {
  concern: "Quero cuidar de",
  routine_step: "Etapa da rotina",
  usage_period: "Uso: manhã ou noite",
};

export default async function Vitrine() {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  const productRows = (data || []) as Product[];
  const productIds = productRows.map((product) => product.id);

  const { data: filterTagRows } = await supabase.from("tags").select("id,name,slug,type").in("type", FILTERABLE_TAG_TYPES);
  const filterTags = (filterTagRows || []) as Tag[];
  const { data: linkRows } = filterTags.length && productIds.length
    ? await supabase.from("content_tags").select("tag_id,content_id").eq("content_type", "product").in("content_id", productIds).in("tag_id", filterTags.map((tag) => tag.id))
    : { data: [] as Array<{ tag_id: string; content_id: string }> };

  const tagById = new Map(filterTags.map((tag) => [tag.id, tag] as const));
  const tagSlugsByProductId = new Map<string, string[]>();
  for (const link of (linkRows || []) as Array<{ tag_id: string; content_id: string }>) {
    const tag = tagById.get(link.tag_id);
    if (!tag) continue;
    tagSlugsByProductId.set(link.content_id, [...(tagSlugsByProductId.get(link.content_id) || []), tag.slug]);
  }

  const products = productRows.map((product) => ({ ...product, tagSlugs: tagSlugsByProductId.get(product.id) || [] }));
  const usedTagSlugs = new Set(products.flatMap((product) => product.tagSlugs));
  const tagGroups = FILTERABLE_TAG_TYPES.map((type) => ({
    label: FILTER_GROUP_LABELS[type] || type,
    options: filterTags
      .filter((tag) => tag.type === type && usedTagSlugs.has(tag.slug))
      .map((tag) => ({ slug: tag.slug, name: tag.name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  }));

  return (
    <main className="site-shell">
      <div className="content-wrap">
        <header className="page-intro page-intro--compact">
          <h1 className="section-title">Meus<br /><em>achados</em></h1>
          <p>O que merece espaço na bancada — e o que só merece um belo tchau.</p>
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
