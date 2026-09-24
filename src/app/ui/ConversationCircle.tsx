"use client";

import { FormEvent, useState } from "react";
import type { JournalComment } from "../types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ConversationCircle({
  postId,
  postTitle,
  comments,
}: {
  postId: string;
  postTitle: string;
  comments: JournalComment[];
}) {
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
      setMessage(data.message || "Recebi sua impressão. Ela vai para a Luana aprovar antes de aparecer para todo mundo. ☾");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tenta de novo em instantes, combinado?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="conversation-circle" aria-labelledby="conversation-circle-title">
      <div>
        <p className="eyebrow">Roda de conversa</p>
        <h2 id="conversation-circle-title" className="font-display mt-3 text-4xl leading-none text-[var(--champagne-pale)]">
          Me conta o que isso acendeu em você.
        </h2>
        <p className="muted mt-4 leading-7">
          Aqui é espaço de troca entre mulheres. Seu email não aparece no site; ele só ajuda a manter a conversa humana e cuidadosa.
        </p>
      </div>

      <form onSubmit={submitComment} className="conversation-form">
        <label>
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seuemail@exemplo.com" autoComplete="email" required />
        </label>
        <label className="hidden" aria-hidden="true">
          Site
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
        </label>
        <label>
          <span>Sua impressão</span>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={5} maxLength={1200} placeholder="O que você pensou, viveu, discordou, lembrou ou riu lendo esse papo?" required />
        </label>
        <button type="submit" disabled={loading} className="luxe-button w-full">
          {loading ? "Enviando..." : "Entrar na roda"}
        </button>
        {message && <p className="newsletter-message" role="status">{message}</p>}
      </form>

      <div className="conversation-list" aria-live="polite">
        {comments.length ? (
          comments.map((comment) => (
            <article key={comment.id} className="conversation-comment">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
                <p className="eyebrow">Leitora Entreluar</p>
                <time className="text-[10px] uppercase tracking-widest text-[var(--muted)]" dateTime={comment.created_at}>
                  {new Date(comment.created_at).toLocaleDateString("pt-BR")}
                </time>
              </div>
              <p>{comment.body}</p>
            </article>
          ))
        ) : (
          <div className="empty-state">
            A roda ainda está em silêncio. Pode puxar a primeira cadeira: às vezes uma frase abre um mundo.
          </div>
        )}
      </div>
    </section>
  );
}
