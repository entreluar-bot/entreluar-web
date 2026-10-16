import { Resend } from "resend";
import { renderPremiumEmail } from "./email-template";
import { applyUnsubscribe, unsubscribeHeaders } from "./unsubscribe";

const FROM = "Luana <luana@entreluar.com.br>";
const SITE = "https://entreluar.com.br";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] || char);

type Kind = "approved" | "reply";

/** Avisa a leitora que o comentário foi publicado ou respondido. Nunca lança: falha de email não pode travar a moderação. */
export async function sendCommentNotification(opts: { email: string; kind: Kind; path?: string | null; readerName?: string | null; reply?: string | null }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const firstName = opts.readerName?.trim().split(/\s+/)[0];
  const greeting = firstName ? `${escapeHtml(firstName)}, ` : "";
  const url = opts.path && opts.path.startsWith("/") ? `${SITE}${opts.path}` : SITE;
  const content = opts.kind === "reply"
    ? {
        subject: "A Luana respondeu o seu comentário 💛",
        preheader: "Vem ver o que eu te respondi.",
        headline: `${greeting}eu respondi você!`,
        bodyHtml: `<p>Li o seu comentário com muito carinho e quis te responder de perto:</p><p><em>${escapeHtml(opts.reply || "").replace(/\n/g, "<br>")}</em></p><p>Vem continuar essa conversa comigo. 💛</p>`,
        ctaText: "Ver minha resposta",
      }
    : {
        subject: "Seu comentário já está na roda 💛",
        preheader: "Ele foi publicado e outras mulheres já podem ler.",
        headline: `${greeting}seu comentário foi publicado!`,
        bodyHtml: "<p>Obrigada por abrir o coração por aqui. Seu comentário já está no ar e outras mulheres podem se identificar com ele.</p><p>Se alguém curtir ou eu responder, te aviso por email.</p>",
        ctaText: "Ver na roda de conversa",
      };
  try {
    const { subject, html } = renderPremiumEmail("blog", { ...content, ctaUrl: url });
    const resend = new Resend(apiKey);
    const response = await resend.emails.send({ from: FROM, to: [opts.email], replyTo: "luana@entreluar.com.br", subject, html: applyUnsubscribe(html, opts.email), headers: unsubscribeHeaders(opts.email) });
    return !response.error;
  } catch {
    return false;
  }
}
