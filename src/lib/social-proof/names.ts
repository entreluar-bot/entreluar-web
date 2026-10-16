import type { AgeBracket } from "./personas";
import { normalizeForMatch } from "./blocklist";

const NAMES_BY_AGE: Record<AgeBracket, string[]> = {
  "38-44": [
    "Priscila", "Tatiane", "Fernanda", "Juliana", "Camila", "Vanessa", "Renata",
    "Daniele", "Patrícia", "Aline", "Luciana", "Karina", "Viviane", "Débora",
    "Fabiana", "Cristiane", "Kelly", "Flávia", "Monique", "Roberta", "Raquel",
  ],
  "45-52": [
    "Cláudia", "Adriana", "Simone", "Márcia", "Alessandra", "Andrea", "Carla",
    "Mônica", "Sandra", "Eliane", "Silvana", "Kátia", "Valéria", "Cíntia",
    "Gisele", "Lucimara", "Rosana", "Paula", "Lilian", "Elaine", "Soraia",
    "Jaqueline", "Denise", "Tânia", "Vânia", "Célia", "Maristela",
  ],
  "53-60": [
    "Rosângela", "Sônia", "Suely", "Marli", "Regina", "Vera", "Lúcia", "Fátima",
    "Solange", "Marlene", "Rita", "Helena", "Miriam", "ângela", "Edna",
    "Berenice", "Zuleica", "Ivone", "Nádia", "Elza", "Tereza", "Beatriz",
    "Denise", "Sueli", "Lourdes", "Cecília", "Inês", "Wanda", "Célia Regina",
  ],
  "61-70": [
    "Neusa", "Dalva", "Iracema", "Conceição", "Aparecida", "Dirce", "Odete",
    "Lourdes", "Terezinha", "Francisca", "Jandira", "Célia", "Leonor", "Zélia",
    "Nair", "Yara", "Cleide", "Marilene", "Josefa", "Socorro", "Graça",
    "Dona Marta", "Carmem", "Doralice", "Eunice", "Guiomar", "Zilda",
  ],
  "70+": [
    "Iracema", "Ofélia", "Benedita", "Sebastiana", "Assunção", "Raimunda",
    "Alzira", "Olímpia", "Antônia", "Cândida", "Zulmira", " Amélia", "Dona Neide",
    "Tia Nena", "Clarice", "Adélia", "Hilda", "Dulce",
  ],
};

const NICKNAMES = [
  "Cidinha", "Nena", "Sol", "Dri", "Lê", "Rô", "Tati", "Malu", "Nanda",
  "Bia", "Bete", "Zezé", "Fafá", "Lili", "Cacá", "Kaka", "Cris", "Tetê",
];

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves",
  "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho",
  "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa", "Rocha",
  "Dias", "Nascimento", "Andrade", "Moreira", "Nunes", "Marques", "Machado",
  "Mendes", "Freitas", "Cardoso", "Ramos", "Gonçalves", "Santana", "Teixeira",
  "Araújo", "Melo", "Cavalcanti", "Batista", "Campos", "Pinheiro", "Moura",
];

const OLD_DOMAINS = ["hotmail.com", "yahoo.com.br", "bol.com.br", "uol.com.br", "terra.com.br", "outlook.com"];
const MODERN_DOMAINS = ["gmail.com", "gmail.com", "gmail.com", "hotmail.com", "outlook.com", "icloud.com"];

export interface GeneratedIdentity {
  readerName: string | null;
  hideReaderName: boolean;
  email: string;
}

export function generateReaderIdentity(
  ageBracket: AgeBracket,
  usedNames: Set<string>,
  rng: () => number = Math.random,
): GeneratedIdentity {
  const hideReaderName = rng() < 0.18;
  const pool = NAMES_BY_AGE[ageBracket] || NAMES_BY_AGE["45-52"];

  let baseName = pool[Math.floor(rng() * pool.length)].trim();
  let guard = 0;
  while (usedNames.has(normalizeForMatch(baseName)) && guard < 25) {
    baseName = pool[Math.floor(rng() * pool.length)].trim();
    guard++;
  }
  if (usedNames.has(normalizeForMatch(baseName))) {
    baseName = NICKNAMES[Math.floor(rng() * NICKNAMES.length)];
  }

  const lastName = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
  const styleRoll = rng();
  let displayName = baseName;

  if (styleRoll < 0.22 && !baseName.includes(" ")) {
    displayName = `${baseName} ${lastName}`;
  } else if (styleRoll >= 0.22 && styleRoll < 0.30) {
    displayName = baseName.toLowerCase();
  } else if (styleRoll >= 0.30 && styleRoll < 0.38) {
    const nick = NICKNAMES.find((n) => !usedNames.has(normalizeForMatch(n)));
    if (nick) displayName = nick;
  }

  usedNames.add(normalizeForMatch(baseName));
  usedNames.add(normalizeForMatch(displayName));

  // Gera e-mail plausível para a faixa etária
  const cleanFirst = normalizeForMatch(baseName).replace(/\s+/g, "");
  const cleanLast = normalizeForMatch(lastName).replace(/\s+/g, "");
  const birthYearMap: Record<AgeBracket, [number, number]> = {
    "38-44": [1982, 1988],
    "45-52": [1974, 1981],
    "53-60": [1966, 1973],
    "61-70": [1956, 1965],
    "70+": [1948, 1955],
  };
  const [minYear, maxYear] = birthYearMap[ageBracket];
  const birthYear = Math.floor(minYear + rng() * (maxYear - minYear + 1));
  const yearSuffix = rng() < 0.45 ? String(birthYear) : rng() < 0.65 ? String(birthYear).slice(2) : String(Math.floor(rng() * 89) + 10);
  const sep = rng() < 0.4 ? "." : rng() < 0.7 ? "_" : "";
  const domains = ageBracket === "61-70" || ageBracket === "70+" || (ageBracket === "53-60" && rng() < 0.45)
    ? OLD_DOMAINS
    : MODERN_DOMAINS;
  const domain = domains[Math.floor(rng() * domains.length)];
  const email = `${cleanFirst}${sep}${cleanLast}${yearSuffix}@${domain}`;

  return {
    readerName: hideReaderName ? null : displayName.slice(0, 80),
    hideReaderName,
    email,
  };
}
