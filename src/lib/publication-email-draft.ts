export type PublicationEmailDraft = { subject: string; preheader: string; headline: string; bodyHtml: string };

const textFromHtml = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

export function buildPublicationEmailDraft(title: string, content: string, kind: "cronica" | "estudei" | "vitrine"): PublicationEmailDraft {
  const excerpt = textFromHtml(content).slice(0, 440).replace(/\s+\S*$/, "").trim();
  const lead = kind === "cronica"
    ? "Tem uma conversa nova no Diário — daquelas que a gente leva para a Roda."
    : kind === "estudei"
      ? "Eu fui atrás das fontes para traduzir esse assunto sem enrolação nem palestra."
      : "Chegou um novo achado na Vitrine, com olhar sincero para o que ele entrega de verdade.";
  return {
    subject: kind === "cronica" ? `Nova conversa: ${title}` : kind === "estudei" ? `Estudei para te explicar: ${title}` : `Novo achado: ${title}`,
    preheader: excerpt || lead,
    headline: title,
    bodyHtml: `<p>${lead}</p><p>${excerpt || "Vem conhecer a novidade com calma, no seu tempo."}</p>`,
  };
}
