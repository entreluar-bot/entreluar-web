export type TagType = "concern" | "ingredient" | "life_topic" | "category";

export type Tag = { id: string; name: string; slug: string; type: TagType };

export type ContentTagLink = { tag_id: string; content_type: "journal" | "product"; content_id: string };

export const TAG_TYPE_LABELS: Record<TagType, string> = {
  concern: "Queixa / necessidade",
  ingredient: "Ativo",
  life_topic: "Vida 50+ & menopausa",
  category: "Categoria",
};

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}
