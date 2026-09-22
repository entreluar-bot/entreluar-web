"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

export default function NewsletterPopover() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const subscribe = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Não consegui concluir a assinatura.");
      setEmail("");
      setMessage("Pronto! Agora a nossa conversa também chega por e-mail. ✨");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  };

  return <div className="newsletter-popover" ref={containerRef}>
    <button type="button" className="newsletter-trigger" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="newsletter-panel">
      <span aria-hidden="true">✉</span><span className="newsletter-trigger__full">Receber cartas</span><span className="newsletter-trigger__short">Assinar</span>
    </button>
    {open && <div id="newsletter-panel" className="newsletter-panel glass-panel">
      <button type="button" className="newsletter-close" onClick={() => setOpen(false)} aria-label="Fechar formulário">×</button>
      <p className="eyebrow">Cartas entre amigas</p>
      <h2 className="font-display mt-2 text-3xl leading-none">Um pouco de brilho<br/>na sua caixa de entrada.</h2>
      <p className="muted mt-3 text-sm leading-6">Achados honestos, conversas novas e zero paciência para spam.</p>
      {message ? <p className="newsletter-message" role="status">{message}</p> : <form onSubmit={subscribe} className="mt-5 flex gap-2">
        <label className="sr-only" htmlFor="newsletter-email">Seu e-mail</label>
        <input id="newsletter-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Seu melhor e-mail" autoComplete="email" required className="min-w-0 flex-1 px-4" />
        <button type="submit" disabled={loading} className="newsletter-submit">{loading ? "…" : "Manda a carta"}</button>
      </form>}
    </div>}
  </div>;
}
