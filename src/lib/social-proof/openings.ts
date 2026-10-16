import { normalizeForMatch } from "./blocklist";

export interface OpeningStyle {
  id: string;
  label: string;
  instruction: string;
}

export const OPENING_STYLES: OpeningStyle[] = [
  {
    id: "historia_direta",
    label: "Cena doméstica ou cotidiana direto no assunto",
    instruction: "Comece direto contando um fato concreto que aconteceu na casa, no trabalho ou no espelho, sem saudação inicial.",
  },
  {
    id: "interjeicao_regional",
    label: "Interjeição regional espontânea",
    instruction: "Abra com uma expressão natural da região da personagem (como quem fala em voz alta sozinha) e emende no assunto.",
  },
  {
    id: "pergunta_direta",
    label: "Pergunta logo na primeira frase",
    instruction: "Comece fazendo uma pergunta direta (para a autora ou para as outras leitoras) sem dar 'oi' antes.",
  },
  {
    id: "minusculo_seco",
    label: "Entrada curta em minúscula sem cerimônia",
    instruction: "Comece já no meio do raciocínio, sem saudação e sem rodeio, como resposta rápida de WhatsApp.",
  },
  {
    id: "reacao_trecho",
    label: "Puxando um detalhe específico do texto",
    instruction: "Abra mencionando com suas próprias palavras um detalhe específico do post que chamou atenção.",
  },
  {
    id: "chamando_autora",
    label: "Chamando a autora pelo nome/apelido",
    instruction: "Comece chamando a autora da forma indicada na ficha e já emende o comentário.",
  },
  {
    id: "contraponto_imediato",
    label: "Ressalva ou experiência oposta logo no início",
    instruction: "Abra já trazendo que na sua pele, rotina ou vida a experiência foi diferente do que o texto descreve.",
  },
  {
    id: "momento_leitura",
    label: "Contando onde ou quando está lendo",
    instruction: "Comece situando rapidamente o momento (no plantão, na fila do banco, tomando café, sem sono de madrugada, no intervalo).",
  },
  {
    id: "lembranca_familiar",
    label: "Citando mãe, tia, irmã, marido ou vizinha",
    instruction: "Comece mencionando alguém próximo (mãe, irmã, amiga, marido, médica, vizinha) antes de falar de si.",
  },
  {
    id: "confissao_engracada",
    label: "Confissão bem-humorada de cara",
    instruction: "Abra admitindo uma mania, preguiça ou teimosia própria com bom humor.",
  },
  {
    id: "idade_ou_tempo",
    label: "Ancorando na própria idade ou tempo de fase",
    instruction: "Comece situando há quanto tempo passa por isso ou a própria idade de forma natural.",
  },
  {
    id: "atrasada_ou_indicada",
    label: "Caiu no post agora ou recebeu de alguém",
    instruction: "Comece dizendo que só viu agora, que uma amiga mandou o link ou que achou procurando outro assunto.",
  },
];

export function extractOpeningSignature(text: string, wordCount = 3): string {
  const normalized = normalizeForMatch(text);
  if (!normalized) return "";
  return normalized.split(" ").slice(0, wordCount).join(" ");
}
