import { Resend } from "resend";
import { renderPremiumEmail } from "./email-template";

const FROM = "Luana <luana@entreluar.com.br>";

export function buildWelcomeEmail() {
  return renderPremiumEmail("site", {
    subject: "Seu guia de rotina para pele madura chegou ✨",
    preheader: "Cinco passos simples, sem susto e sem promessa milagrosa.",
    headline: "Que bom que você chegou, amiga.",
    bodyHtml: `
<p>Eu sou a Luana e, daqui pra frente, vou te mandar só o que vale a sua atenção: achados testados, conversa de amiga sobre menopausa e pele madura, e muita informação sem complicar.</p>
<p>Prometi um presente, então aqui está o <strong>guia de rotina em 1 página</strong>:</p>
<ol>
<li><strong>Limpar com carinho.</strong> Água morna (não quente) e um sabonete suave. Pele madura gosta de delicadeza, não de esfregação.</li>
<li><strong>Hidratar enquanto a pele está levemente úmida.</strong> Ajuda a segurar a água que a pele já tem.</li>
<li><strong>Protetor solar, todo dia de manhã.</strong> Se eu pudesse escolher um único passo, seria este.</li>
<li><strong>À noite, um passo de cada vez.</strong> Introduza um produto novo por vez e espere uns dias antes de somar outro. Assim você descobre o que funciona de verdade.</li>
<li><strong>Constância vale mais que quantidade.</strong> Uma rotina simples que você mantém ganha de dez potinhos que ficam na gaveta.</li>
</ol>
<p>Isto é organização de hábitos, não indicação médica. Se algo irritar ou te preocupar, vale conversar com a sua dermatologista.</p>
<p>Agora me conta: <strong>qual é a sua maior dúvida com a pele hoje?</strong> É só responder este email. Eu leio tudo, e sua pergunta pode virar um papo no site. 💛</p>`,
    ctaText: "Montar minha rotina",
    ctaUrl: "https://entreluar.com.br/minha-rotina",
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
      { from: FROM, to: [email], replyTo: "luana@entreluar.com.br", subject, html },
      { idempotencyKey: `welcome-${email}` },
    );
    return !response.error;
  } catch {
    return false;
  }
}
