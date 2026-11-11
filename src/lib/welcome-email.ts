import { Resend } from "resend";
import { renderPremiumEmail } from "./email-template";
import { applyUnsubscribe, unsubscribeHeaders } from "./unsubscribe";
import { buildMapGuideEmail, type MapGuide } from "./map-guide";

const FROM = "Luana <luana@entreluar.com.br>";

export function buildWelcomeEmail() {
  return renderPremiumEmail("site", {
    subject: "Bem-vinda à roda da Entreluar ✨",
    preheader: "Uma conversa para corpo, vida, recomeços e autocuidado possível.",
    headline: "Que bom que você chegou, amiga.",
    bodyHtml: `
<p>Eu sou a Luana e, daqui pra frente, vou te mandar só o que vale a sua atenção: conversa de amiga sobre corpo, menopausa, relações, recomeços e autocuidado possível. Achados testados entram quando fazem sentido, sem tomar conta da mesa.</p>
<p>Por aqui, você pode ler uma crônica, entender um assunto com fontes e entrar na Roda para contar o que vive. Sem fórmula para parecer mais nova e sem obrigação de estar bem resolvida o tempo todo.</p>
<p>Se chegou por um dos mapas, lembra de uma coisa importante: suas respostas não entram no cadastro. Elas ficam com você. A carta é apenas um jeito de continuar a conversa.</p>
<p>Agora me conta: <strong>que assunto você gostaria de ver por aqui?</strong> É só responder este email. Eu leio tudo, e sua pergunta pode virar um Papo de Mulher. 💛</p>`,
    ctaText: "Entrar na roda",
    ctaUrl: "https://entreluar.com.br/blog",
  });
}

/** Envia o email de boas-vindas. Nunca lança: falha aqui não pode derrubar o cadastro. */
export async function sendWelcomeEmail(email: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    const { subject, html } = buildWelcomeEmail();
    const resend = new Resend(apiKey);
    const response = await resend.emails.send(
      { from: FROM, to: [email], replyTo: "luana@entreluar.com.br", subject, html: applyUnsubscribe(html, email), headers: unsubscribeHeaders(email) },
      { idempotencyKey: `welcome-${email}` },
    );
    return !response.error;
  } catch {
    return false;
  }
}

/** Envia um guia solicitado conscientemente no mapa. As respostas não são gravadas no cadastro. */
export async function sendMapGuideEmail(email: string, guide: MapGuide): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    const { subject, html } = buildMapGuideEmail(guide);
    const resend = new Resend(apiKey);
    const response = await resend.emails.send(
      { from: FROM, to: [email], replyTo: "luana@entreluar.com.br", subject, html: applyUnsubscribe(html, email), headers: unsubscribeHeaders(email) },
      { idempotencyKey: `map-guide-${guide.kind}-${email}-${Date.now()}` },
    );
    return !response.error;
  } catch {
    return false;
  }
}
