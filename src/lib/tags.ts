export type TagType = "concern" | "ingredient" | "life_topic" | "category";

export type Tag = { id: string; name: string; slug: string; type: TagType };

export type ContentTagLink = { tag_id: string; content_type: "journal" | "product"; content_id: string };

export const TAG_TYPE_LABELS: Record<TagType, string> = {
  concern: "Queixa / necessidade",
  ingredient: "Ativo",
  life_topic: "Vida 50+ & menopausa",
  category: "Categoria",
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
