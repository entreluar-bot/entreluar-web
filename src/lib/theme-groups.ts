export type ThemeGroup = {
  slug: string;
  label: string;
  subtitle: string;
  icon: string;
  tagSlugs: string[];
  // Grupos de tag "vida 50+" (type: life_topic) só fazem sentido pra Papo de
  // Mulher — Vitrine e Estudei não devem aparecer aqui (ver
  // PAPO_DE_MULHER_CATEGORIES).
  onlyPapoDeMulher?: boolean;
};

export const PAPO_DE_MULHER_CATEGORIES = ["Papo de Mulher Madura", "Confissões de Madrugada", "Sobrevivendo com Humor"];

// Grupos de exibição da navegação por tema ("O que você quer descobrir
// hoje?"). Cada grupo apenas relaciona tags que já existem em `tags`
// (tabela) — não cria conteúdo novo, só uma forma alternativa de descobrir
// o que já foi publicado.
export const THEME_GROUPS: ThemeGroup[] = [
  {
    slug: "pele-cabelo",
    label: "Pele & cabelo",
    subtitle: "Firmeza, textura, queda e fios em mudança",
    icon: "✦",
    tagSlugs: ["firmeza", "hidratacao", "manchas", "linhas-e-rugas", "olheiras", "sensibilidade", "textura", "protecao-solar", "queda", "afinamento", "ressecamento", "fios-brancos", "crescimento", "couro-cabeludo"],
  },
  {
    slug: "menopausa-bem-estar",
    label: "Menopausa & corpo",
    subtitle: "Sono, fogachos, libido e energia",
    icon: "☾",
    tagSlugs: ["sono", "fogachos", "libido", "humor", "energia", "corpo"],
    onlyPapoDeMulher: true,
  },
  {
    slug: "relacoes-desejo",
    label: "Relações & desejo",
    subtitle: "Namoro, convivência, libido e afeto adulto",
    icon: "◔",
    tagSlugs: ["relacionamentos", "libido", "desejo", "autocuidado", "vida-real"],
    onlyPapoDeMulher: true,
  },
  {
    slug: "familia-filhos",
    label: "Família & filhos",
    subtitle: "Convivência, limites e amor sem sumir de si",
    icon: "⌂",
    tagSlugs: ["familia", "filhos", "convivencia", "limites", "vida-real"],
    onlyPapoDeMulher: true,
  },
  {
    slug: "recomecos-liberdade",
    label: "Recomeços & liberdade",
    subtitle: "Identidade, trabalho e escolhas que agora são suas",
    icon: "◔",
    tagSlugs: ["recomecos", "trabalho", "comportamento", "autocuidado", "vida-real"],
    onlyPapoDeMulher: true,
  },
];
