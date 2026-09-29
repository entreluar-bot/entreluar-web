"use client";

import { FormEvent, useState } from "react";
import type { JournalComment } from "../types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COPY = {
  journal: {
    prompt: "O que você pensou, viveu, discordou, lembrou ou riu lendo esse papo?",
    empty: "Seja a primeira a abrir essa roda ✨",
  },
  "journal-estudei": {
    prompt: "O que mais te surpreendeu nessa explicação? Ficou alguma dúvida?",
    empty: "Seja a primeira a comentar essa explicação ✨",
  },
  product: {
    prompt: "Já usou ou vai testar? Conta pra gente o que achou.",
    empty: "Seja a primeira a comentar esse achado ✨",
  },
} as const;

export default function ConversationCircle({
  postId,
  postTitle,
  comments,
  contentType = "journal",
  variant = "journal",
}: {
  postId: string;
  postTitle: string;
  comments: JournalComment[];
  contentType?: "journal" | "product";
  variant?: keyof typeof COPY;
}) {
  const copy = COPY[variant] || COPY.journal;
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanBody = body.trim();
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setMessage("Me passa um email válido para eu saber que tem uma mulher real do outro lado. ✨");
      return;
    }
    if (cleanBody.length < 8) {
      setMessage("Conta um pouquinho mais, amiga. Uma frase já abre a roda.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          postTitle,
          contentType,
          email: cleanEmail,
          body: cleanBody,
          website,
          path: window.location.pathname,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Não consegui guardar seu comentário agora.");
      setEmail("");
      setBody("");
      setWebsite("");
      setMessage(data.message || "Recebi seu comentário com carinho. Ele vai aparecer assim que eu aprovar, combinado?");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tenta de novo em instantes, combinado?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="conversation-circle" aria-labelledby="conversation-circle-title">
      <div className="conversation-heading">
        <p className="eyebrow">Roda de conversa</p>
        <h2 id="conversation-circle-title" className="font-display mt-3 text-4xl leading-none text-[var(--champagne-pale)]">
          O papo continuou por aqui{comments.length > 0 ? ` — ${comments.length} comentário${comments.length === 1 ? "" : "s"}` : ""}.
        </h2>
      </div>

      <div className="conversation-list" aria-live="polite">
        {comments.length ? (
          comments.map((comment) => (
            <article key={comment.id} className="conversation-comment">
              <div className="conversation-comment__head">
                <span className="conversation-avatar" aria-hidden="true">A</span>
                <div className="flex-1">
                  <p className="eyebrow">Amiga Entreluar</p>
                </div>
                <time className="text-[10px] uppercase tracking-widest text-[var(--muted)]" dateTime={comment.created_at}>
                  {new Date(comment.created_at).toLocaleDateString("pt-BR")}
                </time>
              </div>
              <p>{comment.body}</p>
            </article>
          ))
        ) : (
          <div className="conversation-empty">
            <p className="eyebrow">Ainda não tem ninguém aqui</p>
            <p className="mt-2 font-display text-2xl leading-tight text-[var(--champagne-pale)]">{copy.empty}</p>
          </div>
        )}
      </div>

      <form onSubmit={submitComment} className="conversation-form">
        <div>
          <p className="eyebrow">Agora quero te ouvir</p>
          <p className="muted mt-3 text-sm leading-6">
            Escreve do seu jeito. Seu email fica protegido e não aparece para ninguém.
          </p>
        </div>
        <label>
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seuemail@exemplo.com" autoComplete="email" required />
        </label>
        <label className="hidden" style={{ display: "none" }} aria-hidden="true">
          Site
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
        </label>
        <label>
          <span>Sua impressão</span>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={5} maxLength={1200} placeholder={copy.prompt} required />
        </label>
        <button type="submit" disabled={loading} className="luxe-button w-full">
          {loading ? "Enviando..." : "Contar o que achei"}
        </button>
        {message && <p className="newsletter-message" role="status">{message}</p>}
      </form>
    </section>
  );
}
