export const CLICHE_BLOCKLIST: string[] = [
  "eu toda",
  "sou eu toda",
  "muito eu",
  "mto eu",
  "muito real",
  "mto real",
  "mt real",
  "isso e muito real",
  "isso eh muito real",
  "isso eh mto real",
  "nossa isso eh mto real",
  "me identifiquei",
  "super me identifiquei",
  "me representa",
  "me senti representada",
  "que texto maravilhoso",
  "que texto lindo",
  "texto maravilhoso",
  "texto necessario",
  "que texto necessario",
  "amei o texto",
  "adorei o texto",
  "precisava ler isso",
  "eu precisava ler isso",
  "sem palavras",
  "chorei aqui",
  "chorei lendo",
  "voce arrasa",
  "vc arrasa",
  "arrasa sempre",
  "perfeito lu",
  "verdade lu",
  "falou tudo",
  "disse tudo",
  "assino embaixo",
  "tocou meu coracao",
  "tocou na alma",
  "que reflexao",
  "bela reflexao",
  "discordo um pouco",
  "discordo em parte",
  "concordo em partes",
  "como sempre impecavel",
  "texto impecavel",
  "gratidao por esse texto",
];

export function normalizeForMatch(text: string): string {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findBlockedCliches(text: string, extraForbidden: string[] = []): string[] {
  const normalized = ` ${normalizeForMatch(text)} `;
  if (!normalized.trim()) return [];
  const list = [...CLICHE_BLOCKLIST, ...extraForbidden];
  const found: string[] = [];
  for (const phrase of list) {
    const clean = normalizeForMatch(phrase);
    if (!clean) continue;
    if (normalized.includes(` ${clean} `)) {
      found.push(phrase);
    }
  }
  return Array.from(new Set(found));
}
