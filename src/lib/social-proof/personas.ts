import { OPENING_STYLES, type OpeningStyle } from "./openings";

export type FluencyLevel =
  | "impecavel"
  | "informal_correta"
  | "internetes"
  | "pouca_escolaridade"
  | "caps_lock"
  | "ditado_voz"
  | "corretor_automatico";

export type CommentIntent =
  | "elogio_simples"
  | "desabafo_pessoal"
  | "pergunta_pratica"
  | "concordancia_com_ressalva"
  | "discordancia_educada"
  | "discordancia_firme"
  | "tangente_nada_a_ver"
  | "marcar_amiga"
  | "cetica_desconfiada"
  | "religiosa_carinhosa"
  | "piada_autoironia"
  | "dica_caseira"
  | "chegou_atrasada";

export type LengthTier =
  | "micro_1_3_palavras"
  | "so_emoji"
  | "curto_1_frase"
  | "medio_2_3_frases"
  | "textao_4_6_frases";

export type AgeBracket = "38-44" | "45-52" | "53-60" | "61-70" | "70+";

export interface PersonaCard {
  index: number;
  ageBracket: AgeBracket;
  region: string;
  lifeContext: string;
  fluency: FluencyLevel;
  fluencyInstruction: string;
  intent: CommentIntent;
  intentInstruction: string;
  lengthTier: LengthTier;
  lengthInstruction: string;
  opening: OpeningStyle;
  emojiHabit: string;
  authorAddress: string;
  focusSnippet: string;
}

const AGE_WEIGHTS: Array<{ value: AgeBracket; weight: number }> = [
  { value: "38-44", weight: 14 },
  { value: "45-52", weight: 32 },
  { value: "53-60", weight: 30 },
  { value: "61-70", weight: 17 },
  { value: "70+", weight: 7 },
];

const REGIONS = [
  "interior de Minas Gerais (fala mansa, acolhedora)",
  "capital de São Paulo (prática, corrida, objetiva)",
  "interior de São Paulo",
  "Nordeste (Recife/Salvador/Fortaleza — calorosa, expressiva)",
  "Sul (Porto Alegre/Curitiba — direta, observadora)",
  "Rio de Janeiro (espontânea, despachada)",
  "Centro-Oeste (Goiânia/Brasília)",
  "Norte (Belém/Manaus — menciona calor e umidade)",
  "brasileira morando fora do país há anos",
];

const LIFE_CONTEXTS = [
  "professora aposentada que lê tudo com atenção",
  "enfermeira de plantão noturno, sempre cansada e prática",
  "dona de casa que cuida da mãe idosa e tem pouco tempo pra si",
  "comerciante autônoma que conta cada centavo antes de comprar qualquer coisa",
  "avó coruja que mistura qualquer assunto com os netos",
  "recém-separada redescobrindo a própria vaidade depois dos 50",
  "mulher prática que odeia rotina complicada de 10 passos",
  "servidora pública metódica que pesquisa tudo antes de usar",
  "cabeleireira/manicure que ouve histórias de clientes o dia inteiro",
  "mulher ativa de academia que não aceita discurso derrotista sobre idade",
  "leitora reservada que quase nunca comenta na internet",
  "mãe de filhos adultos que agora mora sozinha com um cachorro",
];

const FLUENCY_OPTIONS: Array<{ value: FluencyLevel; weight: number; instruction: string }> = [
  {
    value: "impecavel",
    weight: 20,
    instruction: "Escrita correta, pontuação no lugar, vocabulário articulado mas natural.",
  },
  {
    value: "informal_correta",
    weight: 30,
    instruction: "Escrita de conversa de WhatsApp: boa ortografia, mas frases soltas, 'pra', 'tá', 'né'.",
  },
  {
    value: "internetes",
    weight: 18,
    instruction: "Digita rápido no celular: abrevia algumas palavras (vc, tbm, pq, qdo, hj), pouca vírgula, começa frase com minúscula.",
  },
  {
    value: "pouca_escolaridade",
    weight: 14,
    instruction: "Mulher simples com pouca intimidade com a escrita: omita acentos, troque 1 ou 2 grafias de forma realista (como juntar palavras 'concerteza'/'agenti' ou esquecer plural/pontuação), mas mantenha compreensível e humana, sem caricatura.",
  },
  {
    value: "caps_lock",
    weight: 5,
    instruction: "ESCREVE TUDO EM LETRA MAIÚSCULA (CAPS LOCK LIGADO), como muitas tias e avós fazem no celular sem perceber que parece grito, mas o tom é simpático.",
  },
  {
    value: "ditado_voz",
    weight: 7,
    instruction: "Usa o microfone do teclado para ditar: texto corrido quase sem vírgula nem ponto, ritmo de fala emendada.",
  },
  {
    value: "corretor_automatico",
    weight: 6,
    instruction: "Digita sem óculos de perto: deixe 1 letrinha trocada de teclado ou 1 palavra levemente traída pelo corretor automático.",
  },
];

const INTENT_OPTIONS: Array<{ value: CommentIntent; weight: number; instruction: string }> = [
  {
    value: "elogio_simples",
    weight: 14,
    instruction: "Apenas aprova ou agradece de forma simples e direta, sem discurso longo.",
  },
  {
    value: "desabafo_pessoal",
    weight: 20,
    instruction: "Conta um episódio real da própria vida (corpo, sono, pele, casamento, trabalho ou envelhecimento) conectado ao tema.",
  },
  {
    value: "pergunta_pratica",
    weight: 11,
    instruction: "Fica com uma dúvida prática sobre como aplicar aquilo na vida real, preço, clima quente ou pele sensível.",
  },
  {
    value: "concordancia_com_ressalva",
    weight: 12,
    instruction: "Gosta do ponto principal, mas faz um 'porém' baseado na realidade financeira, falta de tempo ou rotina pesada.",
  },
  {
    value: "discordancia_educada",
    weight: 9,
    instruction: "Pensa diferente ou teve experiência contrária ao texto. Educada, mas clara. Proibido usar a palavra 'discordo'.",
  },
  {
    value: "discordancia_firme",
    weight: 5,
    instruction: "Acha que o texto romantiza ou simplifica demais a questão e diz isso sem rodeios, de mulher adulta para mulher adulta. Proibido usar a palavra 'discordo'.",
  },
  {
    value: "tangente_nada_a_ver",
    weight: 8,
    instruction: "Puxa um assunto meio lateral ou nada a ver (fala do calor da cidade dela, lembra de uma novela, comenta da neta, pergunta se a autora é de tal lugar ou conta algo aleatório do dia).",
  },
  {
    value: "marcar_amiga",
    weight: 4,
    instruction: "Cita o nome de uma amiga ou irmã no comentário dizendo que lembrou dela ou que vai mandar no zap.",
  },
  {
    value: "cetica_desconfiada",
    weight: 4,
    instruction: "Meio pé atrás: questiona se funciona mesmo depois dos 55 ou diz que já gastou dinheiro à toa com promessas parecidas.",
  },
  {
    value: "religiosa_carinhosa",
    weight: 4,
    instruction: "Mulher de fé que deixa um carinho simples desejar paz/saúde, sem pregação longa.",
  },
  {
    value: "piada_autoironia",
    weight: 10,
    instruction: "Faz piada de si mesma (dos calores, do esquecimento, da preguiça ou do espelho).",
  },
  {
    value: "dica_caseira",
    weight: 5,
    instruction: "Compartilha um truque próprio, hábito antigo ou alternativa barata que faz em casa.",
  },
  {
    value: "chegou_atrasada",
    weight: 4,
    instruction: "Comenta que só encontrou esse texto agora ou que caiu aqui por acaso pesquisando outra coisa.",
  },
];

const LENGTH_OPTIONS: Array<{ value: LengthTier; weight: number; instruction: string }> = [
  {
    value: "micro_1_3_palavras",
    weight: 18,
    instruction: "CURTÍSSIMO: entre 1 e 4 palavras no máximo (tipo quem só deixa presença: 'gostei', 'bom demais', 'pura vdd', 'top', 'muito bom').",
  },
  {
    value: "so_emoji",
    weight: 7,
    instruction: "APENAS EMOJIS: entre 2 e 5 emojis seguidos, ZERO palavras.",
  },
  {
    value: "curto_1_frase",
    weight: 33,
    instruction: "CURTO: apenas 1 frase direta (entre 6 e 16 palavras).",
  },
  {
    value: "medio_2_3_frases",
    weight: 28,
    instruction: "MÉDIO: 2 a 3 frases (entre 20 e 50 palavras).",
  },
  {
    value: "textao_4_6_frases",
    weight: 14,
    instruction: "TEXTÃO DE DESABAFO: 4 a 6 frases (entre 55 e 115 palavras), contando história com começo, meio e fim.",
  },
];

const EMOJI_HABITS = [
  "Não usa nenhum emoji.",
  "Não usa nenhum emoji.",
  "Usa apenas 1 emoji no final.",
  "Usa emojis típicos de tia/avó (🌹, 🙏, 😘, ❤️, 🌻).",
  "Usa risada escrita ('kkkk', 'rsrs' ou 'hahaha') em vez de emoji.",
  "Espalha 2 ou 3 emojis pelo texto.",
];

const AUTHOR_ADDRESS_OPTIONS = [
  "Não cita o nome da autora.",
  "Não cita o nome da autora.",
  "Não cita o nome da autora.",
  "Chama de 'Lu'.",
  "Chama de 'Luana'.",
  "Chama de 'querida' ou 'amiga'.",
  "Chama de 'menina' ou 'moça'.",
];

function pickWeighted<T extends { weight: number }>(items: T[], rng: () => number = Math.random): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function pickRandom<T>(items: T[], rng: () => number = Math.random): T {
  return items[Math.floor(rng() * items.length)];
}

export function extractFocusSnippets(sourceText: string): string[] {
  const sentences = (sourceText || "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25 && s.length <= 220);
  if (sentences.length === 0) return ["o tema geral da postagem"];
  return sentences;
}

export function chooseCommentCount(existingCommentCount: number, rng: () => number = Math.random): number {
  if (existingCommentCount >= 14) return Math.floor(rng() * 2) + 2; // 2 a 3
  if (existingCommentCount >= 7) return Math.floor(rng() * 3) + 2; // 2 a 4
  // Post com poucos ou nenhum comentário: entre 3 e 7, com distribuição variada
  const weights = [
    { value: 3, weight: 22 },
    { value: 4, weight: 28 },
    { value: 5, weight: 24 },
    { value: 6, weight: 16 },
    { value: 7, weight: 10 },
  ];
  return pickWeighted(weights, rng).value;
}

export function drawPersonaBatch(count: number, sourceText: string, rng: () => number = Math.random): PersonaCard[] {
  const snippets = extractFocusSnippets(sourceText);
  const availableOpenings = [...OPENING_STYLES];
  const cards: PersonaCard[] = [];

  let emojiOnlyCount = 0;
  let capsLockCount = 0;
  let lowSchoolingCount = 0;
  let microCount = 0;
  const intentCounts = new Map<CommentIntent, number>();

  for (let i = 0; i < count; i++) {
    const ageBracket = pickWeighted(AGE_WEIGHTS, rng).value;
    const region = pickRandom(REGIONS, rng);
    const lifeContext = pickRandom(LIFE_CONTEXTS, rng);

    // Sorteia tamanho respeitando limites do lote
    let lengthChoice = pickWeighted(LENGTH_OPTIONS, rng);
    if (lengthChoice.value === "so_emoji" && emojiOnlyCount >= 1) {
      lengthChoice = LENGTH_OPTIONS.find((l) => l.value === "curto_1_frase")!;
    }
    if (lengthChoice.value === "micro_1_3_palavras" && microCount >= 2) {
      lengthChoice = LENGTH_OPTIONS.find((l) => l.value === "medio_2_3_frases")!;
    }
    if (lengthChoice.value === "so_emoji") emojiOnlyCount++;
    if (lengthChoice.value === "micro_1_3_palavras") microCount++;

    // Sorteia intenção coerente com o tamanho
    let intentChoice = pickWeighted(INTENT_OPTIONS, rng);
    if (lengthChoice.value === "so_emoji" || lengthChoice.value === "micro_1_3_palavras") {
      intentChoice = INTENT_OPTIONS.find((it) => it.value === "elogio_simples")!;
    } else {
      let guard = 0;
      while ((intentCounts.get(intentChoice.value) || 0) >= 2 && guard < 10) {
        intentChoice = pickWeighted(INTENT_OPTIONS, rng);
        guard++;
      }
    }
    intentCounts.set(intentChoice.value, (intentCounts.get(intentChoice.value) || 0) + 1);

    // Sorteia fluência respeitando tetos para não ficar caricato
    let fluencyChoice = pickWeighted(FLUENCY_OPTIONS, rng);
    if (fluencyChoice.value === "caps_lock" && (capsLockCount >= 1 || lengthChoice.value === "textao_4_6_frases")) {
      fluencyChoice = FLUENCY_OPTIONS.find((f) => f.value === "informal_correta")!;
    }
    if (fluencyChoice.value === "pouca_escolaridade" && lowSchoolingCount >= Math.max(1, Math.floor(count / 3))) {
      fluencyChoice = FLUENCY_OPTIONS.find((f) => f.value === "internetes")!;
    }
    if (fluencyChoice.value === "caps_lock") capsLockCount++;
    if (fluencyChoice.value === "pouca_escolaridade") lowSchoolingCount++;

    // Abertura única dentro do lote
    const openingIndex = Math.floor(rng() * availableOpenings.length);
    const opening = availableOpenings.splice(openingIndex, 1)[0] || pickRandom(OPENING_STYLES, rng);

    const focusSnippet = snippets[i % snippets.length];

    cards.push({
      index: i + 1,
      ageBracket,
      region,
      lifeContext,
      fluency: fluencyChoice.value,
      fluencyInstruction: fluencyChoice.instruction,
      intent: intentChoice.value,
      intentInstruction: intentChoice.instruction,
      lengthTier: lengthChoice.value,
      lengthInstruction: lengthChoice.instruction,
      opening,
      emojiHabit: lengthChoice.value === "so_emoji" ? "Usa apenas 2 a 4 emojis e nenhuma palavra." : pickRandom(EMOJI_HABITS, rng),
      authorAddress: lengthChoice.value === "so_emoji" || lengthChoice.value === "micro_1_3_palavras"
        ? "Não cita o nome da autora."
        : pickRandom(AUTHOR_ADDRESS_OPTIONS, rng),
      focusSnippet,
    });
  }

  return cards;
}
