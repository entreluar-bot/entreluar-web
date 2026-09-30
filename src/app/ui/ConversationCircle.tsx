"use client";

import { FormEvent, useState } from "react";
import type { JournalComment } from "../types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getFirstName(name?: string | null) {
  const cleanName = name?.trim().replace(/\s+/g, " ");
  return cleanName ? cleanName.split(" ")[0] : "";
}

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
  const [readerName, setReaderName] = useState("");
  const [hideReaderName, setHideReaderName] = useState(false);
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanReaderName = readerName.trim().replace(/\s+/g, " ");
    const cleanBody = body.trim();
    if (!hideReaderName && cleanReaderName.length < 2) {
      setMessage("Me conta seu nome para eu assinar seu comentário só com o primeiro nome. Se preferir, marque para publicar como anônimo.");
      return;
    }
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
          readerName: cleanReaderName,
          hideReaderName,
          body: cleanBody,
          website,
          path: window.location.pathname,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Não consegui guardar seu comentário agora.");
      setEmail("");
      setReaderName("");
      setHideReaderName(false);
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
          comments.map((comment) => {
            const signature = comment.hide_reader_name ? "Anônimo" : getFirstName(comment.reader_name) || "Anônimo";
            const avatarLetter = signature === "Anônimo" ? "A" : signature.charAt(0).toUpperCase();
            return (
              <article key={comment.id} className="conversation-comment">
                <div className="conversation-comment__head">
                  <span className="conversation-avatar" aria-hidden="true">{avatarLetter}</span>
                  <div className="flex-1">
                    <p className="eyebrow">Comentário da roda</p>
                  </div>
                  <time className="text-[10px] uppercase tracking-widest text-[var(--muted)]" dateTime={comment.created_at}>
                    {new Date(comment.created_at).toLocaleDateString("pt-BR")}
                  </time>
                </div>
                <p>{comment.body}</p>
                <p className="conversation-signature">— {signature}</p>
              </article>
            );
          })
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
          <span>Seu nome</span>
          <input type="text" value={readerName} onChange={(event) => setReaderName(event.target.value)} placeholder="Como você quer aparecer por aqui?" autoComplete="name" maxLength={80} required={!hideReaderName} />
        </label>
        <label className="conversation-checkbox">
          <input type="checkbox" checked={hideReaderName} onChange={(event) => setHideReaderName(event.target.checked)} />
          <span>Publicar como anônimo</span>
        </label>
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
