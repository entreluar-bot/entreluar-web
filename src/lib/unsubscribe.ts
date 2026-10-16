import { createHmac, timingSafeEqual } from "node:crypto";

const SITE_URL = "https://entreluar.com.br";
const FALLBACK_LINK = "mailto:luana@entreluar.com.br?subject=Quero%20sair%20da%20lista";

/** Marcador usado no HTML do email; trocado pelo link de cada pessoa na hora do envio. */
export const UNSUBSCRIBE_PLACEHOLDER = "{{UNSUBSCRIBE_URL}}";

function sign(email: string) {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update(email.trim().toLowerCase()).digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string) {
  const expected = sign(email);
  if (!expected || !token || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

function linkFor(path: string, email: string) {
  const token = sign(email);
  if (!token) return null;
  const query = new URLSearchParams({ e: email.trim().toLowerCase(), t: token });
  return `${SITE_URL}${path}?${query.toString()}`;
}

/** Página com confirmação, usada no rodapé do corpo do email. */
export const unsubscribePageUrl = (email: string) => linkFor("/sair", email) || FALLBACK_LINK;

/** Endpoint de um clique, usado no cabeçalho List-Unsubscribe (botão do Gmail). */
export const unsubscribeApiUrl = (email: string) => linkFor("/api/unsubscribe", email);

export function applyUnsubscribe(html: string, email: string) {
  return html.split(UNSUBSCRIBE_PLACEHOLDER).join(unsubscribePageUrl(email));
}

/** Cabeçalhos que fazem o Gmail e similares mostrarem "Cancelar inscrição". */
export function unsubscribeHeaders(email: string): Record<string, string> {
  const apiUrl = unsubscribeApiUrl(email);
  if (!apiUrl) return { "List-Unsubscribe": "<mailto:luana@entreluar.com.br?subject=Quero%20sair%20da%20lista>" };
  return {
    "List-Unsubscribe": `<${apiUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
