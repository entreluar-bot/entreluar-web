"use client";

import Link from "next/link";
import { useState } from "react";

type Status = "idle" | "loading" | "left" | "back";

export default function UnsubscribeClient({ email, token }: { email: string; token: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const send = async (action: "leave" | "return") => {
    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ e: email, t: token, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não consegui concluir agora.");
      setStatus(action === "leave" ? "left" : "back");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não consegui concluir agora.");
      setStatus(action === "leave" ? "idle" : "left");
    }
  };

  if (status === "left") {
    return (
      <div>
        <h1 className="section-title mt-4">Pronto,<br /><em>você saiu da lista.</em></h1>
        <p className="muted mx-auto mt-5 max-w-md leading-7">Não vou mais te escrever por email. Sem mágoa, amiga: a porta continua aberta, e o site segue por aqui quando você quiser.</p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <button type="button" className="ghost-button" onClick={() => send("return")}>Foi sem querer, quero voltar</button>
          <Link href="/" className="luxe-button">Ir para o site →</Link>
        </div>
      </div>
    );
  }

  if (status === "back") {
    return (
      <div>
        <h1 className="section-title mt-4">Que bom que<br /><em>você ficou. 💛</em></h1>
        <p className="muted mx-auto mt-5 max-w-md leading-7">Você continua na nossa lista, e eu continuo te escrevendo só quando valer a pena.</p>
        <div className="mt-8"><Link href="/" className="luxe-button">Ir para o site →</Link></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="section-title mt-4">Quer mesmo<br /><em>sair da lista?</em></h1>
      <p className="muted mx-auto mt-5 max-w-md leading-7">Vou parar de enviar emails para <strong className="text-[var(--champagne-pale)]">{email}</strong>. Você pode voltar quando quiser.</p>
      {error && <p className="newsletter-message mx-auto mt-5 max-w-md" role="alert">{error}</p>}
      <div className="mt-8 flex flex-col items-center gap-3">
        <button type="button" className="luxe-button" disabled={status === "loading"} onClick={() => send("leave")}>{status === "loading" ? "Um instante…" : "Sim, quero sair"}</button>
        <Link href="/" className="ghost-button">Não, quero ficar</Link>
      </div>
    </div>
  );
}
