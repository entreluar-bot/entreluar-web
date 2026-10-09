const openings = [
  "abra com uma observação inesperada e direta sobre o tema, sem montar uma cena cotidiana",
  "abra com uma pergunta provocadora que será respondida ao longo do texto",
  "abra com uma opinião forte e bem-humorada, sem introdução de ambiente ou companhia",
  "abra pelo resultado ou pela conclusão mais surpreendente e depois explique como chegou a ela",
  "abra com uma pequena confissão ligada diretamente ao tema, apenas se ela estiver sustentada pelas notas pessoais",
  "abra com uma comparação original ou imagem sensorial, sem transformar isso em uma história inventada",
];

const rhythms = [
  "use ritmo ágil, alternando frases curtas com parágrafos de reflexão",
  "construa o raciocínio como uma descoberta gradual, com humor pontual",
  "organize o texto por contraste: expectativa, realidade e o que eu aprendi",
  "adote um tom de conversa franca, com uma virada de perspectiva no meio",
  "comece incisiva, aprofunde com delicadeza e termine com uma conclusão prática",
];

const closings = [
  "termine com uma frase curta e memorável, sem pergunta retórica",
  "termine com uma reflexão íntima que convide a leitora a se enxergar no tema",
  "termine retomando a ideia da abertura por outro ângulo",
  "termine com uma conclusão prática e espirituosa, sem moral da história",
];

const productAngles = [
  "veredito direto: comece pela decisão que a leitora precisa tomar e depois mostre o porquê",
  "pergunta-resposta: abra com uma dúvida real de compra ou uso e responda com dados da fórmula",
  "conselho de bancada: escreva como quem está organizando a rotina junto com a leitora",
  "compra consciente: pese desejo, benefício real, limitação e lugar na rotina",
  "comparação sensorial: use uma imagem concreta de textura ou sensação apenas se houver base",
  "mini-confissão sustentada: use uma admissão breve só quando as notas pessoais sustentarem",
];

const productOpenings = [
  "abra com o benefício específico mais interessante do produto, sem usar 'vamos falar sobre'",
  "abra com uma frase de compra honesta: para quem faz sentido e para quem talvez não faça",
  "abra pelo ativo mais decisivo e traduza o ganho em linguagem de nécessaire",
  "abra com uma observação sobre pele madura conectada ao produto, sem frase feita",
  "abra por uma pergunta de uso ou escolha que os dados do produto consigam responder",
];

const productHumor = [
  "humor de sobrancelha levantada: seco, curto e ligado ao produto",
  "humor de nécessaire real: aquela praticidade que salva espaço e paciência",
  "humor de maturidade esperta: experiência sem se diminuir por idade",
  "humor mínimo: uma piscadinha no máximo, se combinar com o tema",
];

const productClosings = [
  "feche com um veredito de uso claro, antes do CTA obrigatório",
  "feche com uma frase prática sobre encaixar ou não na rotina",
  "feche com uma conclusão espirituosa sobre desejo com critério",
  "feche retomando o ganho principal sem repetir as palavras da abertura",
];

function pick<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

export function getCreativeDirection() {
  return `${pick(openings)}; ${pick(rhythms)}; ${pick(closings)}`;
}

export function getProductCreativeDirection() {
  return [
    `Ângulo: ${pick(productAngles)}`,
    `Abertura: ${pick(productOpenings)}`,
    `Ritmo: ${pick(rhythms)}`,
    `Humor: ${pick(productHumor)}`,
    `Fechamento: ${pick(productClosings)}`,
  ].join("; ");
}

export type EditorialMaterial = {
  hasPersonalNotes?: boolean;
  hasResearch?: boolean;
  hasOfficialProductInfo?: boolean;
  recentOpeningStyles?: string[];
};

export function getEditorialDirection(material: EditorialMaterial = {}) {
  const eligibleOpenings = [
    "comece pelo benefício ou pela pergunta central que os dados conseguem sustentar",
    "comece por uma opinião editorial da Luana sobre o tema, sem inventar experiência",
    ...(material.hasPersonalNotes ? ["comece por uma confissão breve sustentada pelas notas pessoais"] : []),
    ...(material.hasOfficialProductInfo ? ["comece por uma observação de uso ou textura atribuída à informação oficial"] : []),
    ...(material.hasResearch ? ["comece pelo ativo ou mecanismo mais interessante e traduza o ganho em linguagem cotidiana"] : []),
  ];
  const recent = (material.recentOpeningStyles || []).join(" ").toLowerCase();
  const filteredOpenings = eligibleOpenings.filter((item) => !recent.includes(item.slice(0, 18)));
  const opening = pick(filteredOpenings.length ? filteredOpenings : eligibleOpenings);
  const closing = pick(material.hasPersonalNotes
    ? [
      "termine com uma conclusão prática ligada à experiência registrada",
      "termine com uma reflexão íntima, sem transformar autocuidado em obrigação",
      "termine com humor leve e uma decisão clara para a leitora",
    ]
    : [
      "termine com um veredito editorial baseado nos dados apresentados",
      "termine com um conselho prático de rotina, sem inventar uso pessoal",
      "termine retomando o benefício principal com uma frase autoral e leve",
    ]);
  return `Abertura editorial: ${opening}; Fechamento: ${closing}; alterne o ritmo e não copie estruturas recentes. Sem confirmação, não invente experiência, sensorial ou uso.`;
}

export const originalityRules = `
REGRAS DE ORIGINALIDADE:
- Não comece com vinho, café, namorado, amiga, sofá, espelho, rotina da manhã/noite nem com fórmulas como "outro dia eu estava...".
- Não invente encontros, diálogos, viagens, hábitos ou episódios pessoais da Luana. Só trate um acontecimento como vivido quando ele estiver nas notas pessoais.
- Não use sempre a sequência historinha pessoal → explicação → conselho → pergunta final. Varie a composição, o tamanho dos parágrafos e a progressão das ideias.
- Evite muletas como "amiga, senta que lá vem história", "preciso te contar" e "quem nunca?".
- Evite repetir muletas de beleza como "mágica dos ativos", "pele madura agradece", "sem milagre", "segredinho" e "glow poderoso".
- Não use "segredo irresistível", "descoberta que vai transformar sua rotina" ou promessa semelhante como molde de título.
- A voz continua íntima, bem-humorada e em primeira pessoa, mas intimidade não exige começar com uma cena doméstica.
- Faça a abertura nascer do assunto específico desta geração; ela deve funcionar somente para este texto, não para qualquer postagem.`;
