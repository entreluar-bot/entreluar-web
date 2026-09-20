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

function pick<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

export function getCreativeDirection() {
  return `${pick(openings)}; ${pick(rhythms)}; ${pick(closings)}`;
}

export const originalityRules = `
REGRAS DE ORIGINALIDADE:
- Não comece com vinho, café, namorado, amiga, sofá, espelho, rotina da manhã/noite nem com fórmulas como "outro dia eu estava...".
- Não invente encontros, diálogos, viagens, hábitos ou episódios pessoais da Luana. Só trate um acontecimento como vivido quando ele estiver nas notas pessoais.
- Não use sempre a sequência historinha pessoal → explicação → conselho → pergunta final. Varie a composição, o tamanho dos parágrafos e a progressão das ideias.
- Evite muletas como "amiga, senta que lá vem história", "preciso te contar" e "quem nunca?".
- A voz continua íntima, bem-humorada e em primeira pessoa, mas intimidade não exige começar com uma cena doméstica.
- Faça a abertura nascer do assunto específico desta geração; ela deve funcionar somente para este texto, não para qualquer postagem.`;
