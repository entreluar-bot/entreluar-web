import { originalityRules } from "@/lib/creative-direction";
import { LUANA_VOICE, SIMPLE_LANGUAGE_RULES, TRUTH_RULES } from "@/lib/ai/identity";

export function buildQuotePrompt(input: {
  memoryPrompt: string;
  antiRepetitionPrompt: string;
  existingQuotes: string[];
  retryFeedback?: string[];
}) {
  return `${LUANA_VOICE}
${TRUTH_RULES}
${SIMPLE_LANGUAGE_RULES}
${input.memoryPrompt}
${input.antiRepetitionPrompt}

Crie exatamente 15 pílulas originais de 1 ou 2 frases para mulheres maduras. O objetivo é elevar a moral da maturidade, divertir e dar coragem para os dias reais — sem positividade forçada.

DISTRIBUIÇÃO OBRIGATÓRIA, 3 FRASES DE CADA TEMA:
- humor_cotidiano: situações reconhecíveis, com humor elegante e sem transformar a mulher em piada;
- liberdade: escolhas, limites, autonomia e a tranquilidade de não precisar agradar todo mundo;
- corpo: corpo maduro sem guerra, vergonha ou promessa de rejuvenescimento;
- menopausa: acolhimento e graça sem reduzir a mulher a sintomas;
- motivacao: incentivo concreto, adulto e possível, sem frases prontas de autoajuda.

PROIBIDO, mesmo em contexto positivo ou metafórico: café, vinho, taça, colágeno, espelho, "se priorize", "melhor versão", "idade é só um número", coroa, anti-idade, deboche com sintomas, marido/namorado infantilizado e qualquer ideia de que envelhecer seja defeito.
Cada texto deve ter entre 28 e 220 caracteres, construção própria e uma imagem ou conclusão memorável.

NÃO REPITA NEM PARAFRASE ESTAS PÍLULAS JÁ PUBLICADAS:
${input.existingQuotes.map((quote) => `- ${quote}`).join("\n")}
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
  retryFeedback?: string[];
}) {
  const hasNotes = Boolean(input.impressions?.trim());
  return `${LUANA_VOICE}
${TRUTH_RULES}
${SIMPLE_LANGUAGE_RULES}
${input.memoryPrompt}
${input.antiRepetitionPrompt}
${originalityRules}

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
