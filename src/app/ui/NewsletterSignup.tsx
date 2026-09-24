"use client";

import { FormEvent, useState } from "react";
import { getCampaignContext } from "./CampaignTracker";

type NewsletterSignupProps = {
  source: string;
  compact?: boolean;
};

export default function NewsletterSignup({ source, compact = false }: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const subscribe = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, ...getCampaignContext() }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Não consegui concluir a assinatura.");
      setEmail("");
      setMessage(data.message || "Pronto! Agora a nossa conversa também chega por e-mail. ✨");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  };

  if (message) return <p className="newsletter-message" role="status">{message}</p>;

  return (
    <form onSubmit={subscribe} className={compact ? "mt-5 flex gap-2" : "newsletter-inline-form"}>
      <label className="sr-only" htmlFor={`newsletter-email-${source}`}>Seu e-mail</label>
      <input
        id={`newsletter-email-${source}`}
        type="email"
        value={email}
        onChange={event => setEmail(event.target.value)}
        placeholder="Seu melhor e-mail"
        autoComplete="email"
        required
        className="min-w-0 flex-1 px-4"
      />
      <button type="submit" disabled={loading} className="newsletter-submit">{loading ? "…" : "Manda a carta"}</button>
    </form>
  );
}
