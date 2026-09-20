export type NewsletterType = "site" | "blog" | "produto" | "resenha" | "pilula";

type EmailContent = {
  subject: string;
  preheader: string;
  headline: string;
  bodyHtml: string;
  ctaText: string;
  ctaUrl?: string;
};

const variants: Record<NewsletterType, { label: string; defaultUrl: string; accent: string; closing: string }> = {
  site: { label: "BEM-VINDA À ENTRELUAR", defaultUrl: "https://entreluar.com.br", accent: "#E6BD78", closing: "Um lugar para viver a beleza sem pedir licença." },
  blog: { label: "NOVA CONVERSA NO DIÁRIO", defaultUrl: "https://entreluar.com.br/blog", accent: "#D88A9D", closing: "Tem conversa que a gente termina diferente de como começou." },
  produto: { label: "NOVO ACHADO DA LUANA", defaultUrl: "https://entreluar.com.br/vitrine", accent: "#E6BD78", closing: "Eu testo primeiro e te conto tudo depois — sem filtro." },
  resenha: { label: "ESTUDEI PARA TE EXPLICAR", defaultUrl: "https://entreluar.com.br/resenhas", accent: "#F2D2A2", closing: "Ciência também pode parecer uma conversa entre amigas." },
  pilula: { label: "UMA DOSE PARA HOJE", defaultUrl: "https://entreluar.com.br/pilulas", accent: "#CF8294", closing: "Guarde esta carta para reler quando precisar voltar para si." },
};

const escapeText = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] || char);

const sanitizeBody = (html: string) => html
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
  .replace(/javascript:/gi, "")
  .replace(/<(?!\/?(?:p|strong|em|i|ul|ol|li|br|a)\b)[^>]*>/gi, "")
  .replace(/<a\s+([^>]*?)>/gi, (_match, attrs: string) => {
    const href = attrs.match(/href=["'](https?:\/\/[^"']+)["']/i)?.[1] || "https://entreluar.com.br";
    return `<a href="${href}" style="color:#E6BD78;text-decoration:underline;font-weight:700;">`;
  });

export function renderPremiumEmail(type: NewsletterType, content: EmailContent) {
  const variant = variants[type] || variants.site;
  const ctaUrl = content.ctaUrl?.startsWith("https://") ? content.ctaUrl : variant.defaultUrl;
  const subject = escapeText(content.subject.trim());
  const preheader = escapeText(content.preheader.trim());
  const headline = escapeText(content.headline.trim());
  const ctaText = escapeText(content.ctaText.trim());
  const body = sanitizeBody(content.bodyHtml);

  return { subject: content.subject.trim(), html: `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#12070A;color:#F7E8D0;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#12070A;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#2A0C14;border:1px solid #603044;border-radius:28px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.35);">
<tr><td style="height:8px;background:${variant.accent};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="center" style="padding:28px 28px 22px;background:#1C080E;border-bottom:1px solid #4C2633;">
<a href="https://entreluar.com.br" style="color:#F7E8D0;text-decoration:none;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1;letter-spacing:-1px;">Entreluar<span style="color:${variant.accent};">◔</span></a>
<div style="margin-top:11px;color:${variant.accent};font-size:10px;font-weight:700;letter-spacing:3px;">BELEZA MADURA, SEM PEDIR LICENÇA</div>
</td></tr>
<tr><td style="padding:46px 38px 18px;">
<div style="color:${variant.accent};font-size:10px;line-height:1.5;font-weight:700;letter-spacing:2.5px;">${variant.label}</div>
<h1 style="margin:15px 0 22px;color:#FFF8EF;font-family:Georgia,'Times New Roman',serif;font-size:42px;line-height:1.08;font-weight:400;letter-spacing:-1px;">${headline}</h1>
<div style="height:1px;background:#5D3040;margin:0 0 26px;"></div>
<div style="color:#E9D6D8;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:1.75;">${body}</div>
</td></tr>
<tr><td align="center" style="padding:20px 38px 42px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" bgcolor="${variant.accent}" style="border-radius:999px;">
<a href="${ctaUrl}" style="display:inline-block;padding:17px 30px;color:#2A0C14;text-decoration:none;font-size:12px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;">${ctaText} &nbsp;→</a>
</td></tr></table>
<p style="margin:26px 0 0;color:#B9999F;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-style:italic;line-height:1.6;">${variant.closing}</p>
</td></tr>
<tr><td style="padding:28px 38px;background:#1C080E;border-top:1px solid #4C2633;text-align:center;">
<p style="margin:0 0 10px;color:#F7E8D0;font-family:Georgia,'Times New Roman',serif;font-size:20px;">Com carinho,<br><strong style="color:${variant.accent};">Luana ✨</strong></p>
<p style="margin:18px 0 0;color:#9F7E84;font-size:11px;line-height:1.65;">Você recebeu esta carta porque escolheu acompanhar a Entreluar.<br><a href="https://entreluar.com.br" style="color:#C9A66C;">Visitar o site</a> &nbsp;•&nbsp; <a href="https://instagram.com/entreluarBeauty" style="color:#C9A66C;">Instagram</a></p>
</td></tr></table>
</td></tr></table></body></html>` };
}
