import type { SupabaseClient } from "@supabase/supabase-js";

export type TagType = "concern" | "ingredient" | "life_topic" | "category" | "routine_step" | "usage_period";

export type Tag = { id: string; name: string; slug: string; type: TagType };

export type ContentTagLink = { tag_id: string; content_type: "journal" | "product"; content_id: string };

export const TAG_TYPE_LABELS: Record<TagType, string> = {
  concern: "Queixa / necessidade",
  ingredient: "Ativo",
  life_topic: "Vida 50+ & menopausa",
  category: "Categoria",
  routine_step: "Etapa da rotina",
  usage_period: "Uso: manhã ou noite",
};

export function formatTagsForPrompt(tags: Tag[]) {
  const byType = new Map<TagType, string[]>();
  for (const tag of tags) {
    byType.set(tag.type, [...(byType.get(tag.type) || []), tag.slug]);
  }
  return (Object.keys(TAG_TYPE_LABELS) as TagType[])
    .filter((type) => byType.get(type)?.length)
    .map((type) => `${TAG_TYPE_LABELS[type]}: ${byType.get(type)!.join(", ")}`)
    .join("\n");
}

export function filterValidTagSlugs(slugs: unknown, tags: Tag[]) {
  const valid = new Set(tags.map((tag) => tag.slug));
  return (Array.isArray(slugs) ? slugs : []).filter((slug): slug is string => typeof slug === "string" && valid.has(slug));
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

// Prefixado porque o slug de tag é único no banco pra qualquer tipo, e algumas
// categorias de produto (ex.: "Corpo") já colidem com slugs de life_topic/concern.
export function categoryTagSlug(category: string) {
  return `categoria-${slugify(category)}`;
}

export async function ensureIngredientTag(
  supabase: SupabaseClient,
  tags: Tag[],
  rawName: string
): Promise<{ tag: Tag; isNew: boolean } | null> {
  const name = rawName.trim();
  if (!name) return null;
  const slug = slugify(name);
  if (!slug) return null;
  const existing = tags.find((tag) => tag.type === "ingredient" && tag.slug === slug);
  if (existing) return { tag: existing, isNew: false };
  const { data, error } = await supabase.from("tags").insert([{ name, slug, type: "ingredient" }]).select().single();
  if (error || !data) return null;
  return { tag: data as Tag, isNew: true };
}
