import { CLICHE_BLOCKLIST } from "./blocklist";
import type { SocialProofMemory } from "./memory";
import type { PersonaCard } from "./personas";
import type { ValidationIssue } from "./validate";

function formatCardSpec(card: PersonaCard): string {
  return [
    `COMENTÁRIO #${card.index}:`,
    `- Quem é: mulher de ${card.ageBracket} anos, ${card.region}, ${card.lifeContext}.`,
    `- Jeito de escrever: ${card.fluencyInstruction}`,
    `- Intenção: ${card.intentInstruction}`,
    `- Tamanho: ${card.lengthInstruction}`,
    `- Como começar: ${card.opening.instruction}`,
    `- Emojis/risada: ${card.emojiHabit}`,
    `- Como trata a autora: ${card.authorAddress}`,
    `- Ponto do texto que chamou a atenção dela: "${card.focusSnippet}"`,
  ].join("\n");
}

export function buildSocialProofPrompt(params: {
  title: string;
  category: string;
  sourceText: string;
  cards: PersonaCard[];
  memory: SocialProofMemory;
}): string {
  const { title, category, sourceText, cards, memory } = params;
  const trimmedSource = (sourceText || "").slice(0, 2000);

  const forbiddenPhrases = [
    ...CLICHE_BLOCKLIST.slice(0, 28),
    ...memory.repeatedTrigrams.slice(0, 20),
  ].join(" | ");

  const forbiddenOpenings = memory.recentOpenings.slice(0, 25).join(" | ");

  return `Você está simulando a caixa de comentários de uma comunidade real de mulheres maduras brasileiras no blog Entreluar.
Postagem: "${title || "Sem título"}" (Categoria: ${category || "Geral"})
Trecho do texto publicado:
"""${trimmedSource}"""

Gere EXATAMENTE ${cards.length} comentários independentes, seguindo FIELMENTE a ficha individual de cada leitora abaixo.
Cada comentário deve parecer escrito por uma pessoa diferente, de cabeça, origem, humor e escolaridade próprias.

FICHAS DAS LEITORAS:
${cards.map(formatCardSpec).join("\n\n")}

REGRAS INEGOCIÁVEIS DE REALISMO:
1. NUNCA use frases prontas de IA ou clichês de rede social. É PROIBIDO usar qualquer uma destas expressões ou variações próximas:
   [${forbiddenPhrases}]
2. NUNCA comece dois comentários do mesmo jeito. Também é PROIBIDO começar com qualquer uma destas aberturas já usadas:
   [${forbiddenOpenings || "nenhuma"}]
3. Não repita a mesma estrutura gramatical entre os comentários. Respeite rigorosamente o tamanho e o nível de escrita de cada ficha (inclusive erros naturais de digitação, falta de acento ou CAPS LOCK quando pedido).
4. Não invente nomes para a autora além de Lu ou Luana, e só cite o nome dela quando a ficha pedir.
5. Devolva apenas o JSON com o array "comments", mantendo o mesmo "index" numérico de cada ficha e o texto em "body".`;
}

export function buildRetrySocialProofPrompt(params: {
  title: string;
  sourceText: string;
  rejectedCards: PersonaCard[];
  issues: ValidationIssue[];
  alreadyApprovedBodies: string[];
  memory: SocialProofMemory;
}): string {
  const { title, sourceText, rejectedCards, issues, alreadyApprovedBodies, memory } = params;
  const issueMap = new Map(issues.map((i) => [i.index, i.reasons.join("; ")]));

  const specs = rejectedCards.map((card) => {
    const reason = issueMap.get(card.index) || "repetiu padrão";
    return `${formatCardSpec(card)}\n- MOTIVO DE REPROVAÇÃO ANTERIOR (corrija obrigatoriamente): ${reason}`;
  });

  const avoidOpenings = [
    ...memory.recentOpenings.slice(0, 20),
    ...alreadyApprovedBodies.map((b) => b.split(/\s+/).slice(0, 3).join(" ")),
  ].join(" | ");

  return `Reescreva APENAS os ${rejectedCards.length} comentários abaixo para o post "${title}".
Resumo do texto: """${(sourceText || "").slice(0, 1200)}"""

Eles foram reprovados na checagem de autenticidade. Siga cada ficha e corrija o motivo apontado:

${specs.join("\n\n")}

Proibido usar clichês (${CLICHE_BLOCKLIST.slice(0, 20).join(", ")}) ou começar parecido com: [${avoidOpenings}].
Devolva apenas o JSON com "comments" contendo { "index", "body" }.`;
}
