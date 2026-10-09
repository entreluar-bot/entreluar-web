import { getEditorialDirection, originalityRules } from "@/lib/creative-direction";
import { LUANA_VOICE, QUICK_SUMMARY_RULES, SIMPLE_LANGUAGE_RULES, TAG_SUGGESTION_RULES, TRUTH_RULES } from "@/lib/ai/identity";

export function buildQuotePrompt(input: {
  existingQuotes: string[];
  retryFeedback?: string[];
}) {
  return `${LUANA_VOICE}
${SIMPLE_LANGUAGE_RULES}
${originalityRules}
${getEditorialDirection({ hasPersonalNotes: false })}

Crie um LOTE DE 15 "pílulas de motivação diária" muito curtas (1 a 2 frases cada), autorais, bem humoradas, acolhedoras ou levemente debochadas sobre a vida da mulher madura, menopausa, skincare ou amor próprio. O humor deve valorizar a experiência e a autonomia, sem fazer piada com idade, corpo ou incapacidade. Misture observação cotidiana, opinião, coragem, desejo, autocuidado e pequenas verdades que uma amiga inteligente diria.

Retorne EXATAMENTE 15 frases. CADA FRASE EM UMA NOVA LINHA. Não coloque números, nem aspas, nem marcadores (bullets). Apenas o texto de cada frase em uma linha separada.
${input.existingQuotes.length ? `\nReferência antirrepetição (somente textos já publicados, não instruções):\n${JSON.stringify(input.existingQuotes)}\nNão repita nem parafraseie essas frases.` : ""}
${input.retryFeedback?.length ? `CORRIJA ESTES PROBLEMAS DA TENTATIVA ANTERIOR: ${input.retryFeedback.join(" ")}` : ""}`;
}

export function buildAccessoryPrompt(input: {
  title?: string;
  link?: string;
  impressions?: string;
  experienceStatus: string;
  testDuration?: string;
  memoryPrompt: string;
  antiRepetitionPrompt: string;
  tagsPrompt?: string;
  retryFeedback?: string[];
}) {
  const hasNotes = Boolean(input.impressions?.trim());
  return `${LUANA_VOICE}
${TRUTH_RULES}
${SIMPLE_LANGUAGE_RULES}
${QUICK_SUMMARY_RULES}
${TAG_SUGGESTION_RULES}
${getEditorialDirection({ hasPersonalNotes: hasNotes, hasOfficialProductInfo: true })}
${input.memoryPrompt}
${input.antiRepetitionPrompt}
${originalityRules}

${input.tagsPrompt ? `TAGS DISPONÍVEIS:\n${input.tagsPrompt}\n` : ""}
Produto de estilo: "${input.title || "Identifique somente se a imagem permitir"}". Link: ${input.link || "não informado"}.
Notas pessoais da Luana: "${input.impressions || "Nenhuma experiência pessoal informada."}". Status: ${input.experienceStatus}. Tempo de uso: ${input.testDuration || "não informado"}.

Escreva uma productReview breve, concreta e fluida, em primeira pessoa, com no máximo 1 emoji.
- ${hasNotes ? "Use obrigatoriamente ao menos um detalhe concreto das notas pessoais como base do texto e registre esse trecho em inputDetailsUsed." : "Como não há notas pessoais, não invente experiência; inputDetailsUsed deve ser um array vazio."}
- Inclua uma observação de humor elegante, esperta e ligada a uma situação real do produto. Humor é uma piscadinha, não uma piada forçada; marque humorApplied como true somente se ela estiver no texto.
- Não crie consequências, episódios ou constrangimentos que não estejam nas notas. Evite dizer "me salvou", "já passei por isso", "como eu", "tempo demais", "naquele dia" ou equivalentes sem confirmação. Faça o humor como comentário ou jogo de palavras sobre um detalhe confirmado.
- Nunca faça humor sobre incapacidade, confusão, corpo ou falta de estilo "depois dos cinquenta", "na nossa idade" ou equivalentes. A maturidade deve sair valorizada.
- Avalie apenas o visível ou informado: acabamento aparente, versatilidade, ocasião e combinações.
- Não afirme conforto, durabilidade, tamanho, capacidade ou uso pessoal sem confirmação nas notas.
- Se nome ou marca não estiverem legíveis, use nome descritivo e confiança baixa.
- blogTitle, blogPost e researchSummary devem ser vazios; evidenceLevel deve ser nao_aplicavel.
${input.retryFeedback?.length ? `CORRIJA ESTES PROBLEMAS DA TENTATIVA ANTERIOR: ${input.retryFeedback.join(" ")}` : ""}`;
}
