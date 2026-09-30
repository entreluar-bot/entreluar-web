export type TagType = "concern" | "ingredient" | "life_topic" | "category" | "routine_phase" | "routine_period" | "skin_type" | "origin" | "body_part";

export type Tag = { id: string; name: string; slug: string; type: TagType };

export type ContentTagLink = { tag_id: string; content_type: "journal" | "product"; content_id: string };

export const TAG_TYPE_LABELS: Record<TagType, string> = {
  concern: "Queixa / necessidade",
  ingredient: "Ativo",
  life_topic: "Vida 50+ & menopausa",
  category: "Categoria",
  routine_phase: "Fase da rotina",
  routine_period: "Período da rotina",
  skin_type: "Tipo de pele",
  origin: "Origem",
  body_part: "Parte do corpo",
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

export function excludeLifeTopic(tags: Tag[]) {
  return tags.filter((tag) => tag.type !== "life_topic");
}

export function filterValidTagSlugs(slugs: unknown, tags: Tag[]) {
  const valid = new Set(tags.map((tag) => tag.slug));
  return (Array.isArray(slugs) ? slugs : []).filter((slug): slug is string => typeof slug === "string" && valid.has(slug));
}

export function buildRoutineSentence(tags: Tag[]): string {
  const byType = new Map<TagType, string[]>();
  for (const tag of tags) byType.set(tag.type, [...(byType.get(tag.type) || []), tag.name]);
  const join = (names?: string[]) => {
    if (!names?.length) return undefined;
    if (names.length === 1) return names[0];
    return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
  };

  const parts: string[] = [];
  const concerns = join(byType.get("concern"));
  if (concerns) parts.push(`Resolve ${concerns}.`);

  const ingredientNames = byType.get("ingredient");
  const ingredients = join(ingredientNames);
  if (ingredients) parts.push(`Ativo${(ingredientNames?.length || 0) > 1 ? "s" : ""} principal: ${ingredients}.`);

  const phase = byType.get("routine_phase")?.[0];
  const period = byType.get("routine_period")?.[0];
  if (phase && period) parts.push(`Entra na rotina como ${phase.toLowerCase()}, ${period.toLowerCase()}.`);
  else if (phase) parts.push(`Entra na rotina como ${phase.toLowerCase()}.`);
  else if (period) parts.push(`Uso indicado: ${period.toLowerCase()}.`);

  const skinType = join(byType.get("skin_type"));
  if (skinType) parts.push(`Indicado pra ${skinType.toLowerCase()}.`);

  const origin = byType.get("origin")?.[0];
  if (origin) parts.push(`Origem: ${origin}.`);

  const bodyPart = join(byType.get("body_part"));
  if (bodyPart) parts.push(`Área: ${bodyPart.toLowerCase()}.`);

  return parts.join(" ");
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
