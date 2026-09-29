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
    slug: "pele",
    label: "Pele",
    subtitle: "Firmeza, manchas, textura e sensibilidade",
    icon: "✦",
    tagSlugs: ["firmeza", "hidratacao", "manchas", "linhas-e-rugas", "olheiras", "sensibilidade", "textura", "protecao-solar"],
  },
  {
    slug: "cabelos",
    label: "Cabelos",
    subtitle: "Queda, fios brancos e couro cabeludo",
    icon: "◇",
    tagSlugs: ["queda", "afinamento", "ressecamento", "fios-brancos", "crescimento", "couro-cabeludo"],
  },
  {
    slug: "menopausa-bem-estar",
    label: "Menopausa & bem-estar",
    subtitle: "Sono, fogachos, libido e energia",
    icon: "☾",
    tagSlugs: ["sono", "fogachos", "libido", "humor", "energia", "corpo"],
    onlyPapoDeMulher: true,
  },
  {
    slug: "vida-50",
    label: "Vida 50+",
    subtitle: "Relacionamentos, recomeços e vida real",
    icon: "◔",
    tagSlugs: ["relacionamentos", "autocuidado", "recomecos", "trabalho", "comportamento", "vida-real"],
    onlyPapoDeMulher: true,
  },
  {
    slug: "ativos",
    label: "Ativos",
    subtitle: "Retinal, peptídeos, vitamina C e mais",
    icon: "◈",
    tagSlugs: ["retinal", "retinol", "peptideos", "ceramidas", "vitamina-c", "niacinamida", "acido-hialuronico", "nad-plus"],
  },
];
