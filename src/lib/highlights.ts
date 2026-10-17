export type HighlightKind = "featured" | "mostRead" | "newest";

type Flagged = {
  id: string;
  is_featured?: boolean;
  is_most_viewed?: boolean;
  is_new?: boolean;
};

export const HIGHLIGHT_META: Record<HighlightKind, { badge: string; hook: string; label: string }> = {
  featured: {
    badge: "✦ Em destaque",
    label: "Em destaque",
    hook: "Se você só tiver cinco minutinhos hoje, começa por esse, amiga.",
  },
  mostRead: {
    badge: "🔥 O mais lido",
    label: "O mais lido",
    hook: "O queridinho da nossa roda de conversa. Vem ver por que todo mundo comentou.",
  },
  newest: {
    badge: "✨ Novidade quentinha",
    label: "Novo",
    hook: "Acabou de sair do forno. Quer ser a primeira a ler?",
  },
};

export type PickedHighlight<T> = { kind: HighlightKind; item: T };

// Ordem fixa: destaque, mais lido, novo. Cada artigo aparece uma única vez;
// se o mesmo artigo tiver duas marcas, fica com a de maior prioridade.
export function pickHighlights<T extends Flagged>(items: T[]): PickedHighlight<T>[] {
  const used = new Set<string>();
  const result: PickedHighlight<T>[] = [];
  const steps: Array<[HighlightKind, (item: T) => boolean | undefined]> = [
    ["featured", (item) => item.is_featured],
    ["mostRead", (item) => item.is_most_viewed],
    ["newest", (item) => item.is_new],
  ];
  for (const [kind, test] of steps) {
    const found = items.find((item) => test(item) && !used.has(item.id));
    if (found) {
      used.add(found.id);
      result.push({ kind, item: found });
    }
  }
  return result;
}
