import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Product } from "@/app/types";
import type { RoutinePeriodKey, RoutineStepKey } from "@/lib/routine";

export type RoutineCandidate = Product & {
  phase?: RoutineStepKey;
  periods: RoutinePeriodKey[];
  skinTypes: string[];
  origin?: "brasileiro" | "coreano" | "outro";
  bodyPart?: string;
  sensitiveFriendly: boolean;
  concernSlugs: string[];
};

type ContentTagLink = { tag_id: string; content_id: string };
type TagRow = { id: string; slug: string; type: string };

const ROUTINE_PHASE_SLUGS = new Set<RoutineStepKey>(["limpar", "tonificar", "tratar", "hidratar", "proteger"]);

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const { data: tagRows } = await supabase
    .from("tags")
    .select("id,slug,type")
    .or("type.in.(routine_phase,routine_period,skin_type,origin,body_part),slug.eq.sensibilidade");
  const tags = (tagRows || []) as TagRow[];
  if (!tags.length) return NextResponse.json({ candidates: [] });

  const tagById = new Map(tags.map((tag) => [tag.id, tag]));

  const { data: linkRows } = await supabase
    .from("content_tags")
    .select("tag_id,content_id")
    .eq("content_type", "product")
    .in("tag_id", tags.map((tag) => tag.id));
  const links = (linkRows || []) as ContentTagLink[];

  const tagsByProduct = new Map<string, TagRow[]>();
  for (const link of links) {
    const tag = tagById.get(link.tag_id);
    if (!tag) continue;
    tagsByProduct.set(link.content_id, [...(tagsByProduct.get(link.content_id) || []), tag]);
  }

  const productIdsWithPhase = [...tagsByProduct.entries()]
    .filter(([, productTags]) => productTags.some((tag) => tag.type === "routine_phase"))
    .map(([productId]) => productId);
  if (!productIdsWithPhase.length) return NextResponse.json({ candidates: [] });

  const { data: productRows } = await supabase.from("products").select("*").in("id", productIdsWithPhase);
  const products = (productRows || []) as Product[];

  // Preocupação principal (concern) fica de fora da primeira busca porque o
  // vocabulário de queixas é grande (navegação por tema); só vale a pena
  // buscar para os produtos que já sobreviveram ao filtro de fase.
  const { data: concernTagRows } = await supabase.from("tags").select("id,slug,type").eq("type", "concern");
  const concernTags = (concernTagRows || []) as TagRow[];
  const concernTagById = new Map(concernTags.map((tag) => [tag.id, tag]));
  const { data: concernLinkRows } = concernTags.length
    ? await supabase
        .from("content_tags")
        .select("tag_id,content_id")
        .eq("content_type", "product")
        .in("content_id", productIdsWithPhase)
        .in("tag_id", concernTags.map((tag) => tag.id))
    : { data: [] as ContentTagLink[] };
  const concernSlugsByProduct = new Map<string, string[]>();
  for (const link of (concernLinkRows || []) as ContentTagLink[]) {
    const tag = concernTagById.get(link.tag_id);
    if (!tag) continue;
    concernSlugsByProduct.set(link.content_id, [...(concernSlugsByProduct.get(link.content_id) || []), tag.slug]);
  }

  const candidates: RoutineCandidate[] = products.map((product) => {
    const productTags = tagsByProduct.get(product.id) || [];
    const phaseSlug = productTags.find((tag) => tag.type === "routine_phase")?.slug as RoutineStepKey | undefined;
    const periodSlugs = productTags.filter((tag) => tag.type === "routine_period").map((tag) => tag.slug);
    const periods: RoutinePeriodKey[] = periodSlugs.includes("ambos") || !periodSlugs.length
      ? ["manha", "noite"]
      : periodSlugs.filter((slug): slug is RoutinePeriodKey => slug === "manha" || slug === "noite");

    return {
      ...product,
      phase: phaseSlug && ROUTINE_PHASE_SLUGS.has(phaseSlug) ? phaseSlug : undefined,
      periods,
      skinTypes: productTags.filter((tag) => tag.type === "skin_type").map((tag) => tag.slug),
      origin: productTags.find((tag) => tag.type === "origin")?.slug as "brasileiro" | "coreano" | "outro" | undefined,
      bodyPart: productTags.find((tag) => tag.type === "body_part")?.slug,
      sensitiveFriendly: productTags.some((tag) => tag.slug === "sensibilidade"),
      concernSlugs: concernSlugsByProduct.get(product.id) || [],
    };
  });

  return NextResponse.json({ candidates });
}
