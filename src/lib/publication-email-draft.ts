export type PublicationEmailDraft = { subject: string; preheader: string; headline: string; bodyHtml: string };

const textFromHtml = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

const excerptFrom = (content: string, limit = 440) => {
  const text = textFromHtml(content);
  if (text.length <= limit) return text;
  const window = text.slice(0, limit + 1);
  const sentenceEnds = Array.from(window.matchAll(/[.!?…](?=\s|$)/g));
  const lastSentenceEnd = sentenceEnds.at(-1)?.index;
  if (lastSentenceEnd !== undefined && lastSentenceEnd >= Math.min(140, Math.floor(limit / 2))) {
    return window.slice(0, lastSentenceEnd + 1).trim();
  }
  return `${window.slice(0, window.lastIndexOf(" ")).trim()}…`;
};

export function buildPublicationEmailDraft(title: string, content: string, kind: "cronica" | "estudei" | "vitrine"): PublicationEmailDraft {
  const excerpt = excerptFrom(content);
  const lead = kind === "cronica"
    ? "Tem uma conversa nova no Diário — daquelas que a gente leva para a Roda."
    : kind === "estudei"
      ? "Eu fui atrás das fontes para traduzir esse assunto sem enrolação nem palestra."
      : "Chegou um novo achado na Vitrine, com olhar sincero para o que ele entrega de verdade.";
  return {
    subject: kind === "cronica" ? `Nova conversa: ${title}` : kind === "estudei" ? `Estudei para te explicar: ${title}` : `Novo achado: ${title}`,
    preheader: excerpt || lead,
    headline: title,
    bodyHtml: kind === "cronica"
      ? `<p>${lead}</p><p>${excerpt || "Tem uma conversa nova esperando você, com calma e sem pressa."}</p><p><strong>Continue lendo comigo lá na nossa comunidade.</strong> A crônica inteira já está no ar — e, depois dela, a Roda de Conversa fica esperando a sua história.</p>`
      : `<p>${lead}</p><p>${excerpt || "Vem conhecer a novidade com calma, no seu tempo."}</p>`,
  };
}
