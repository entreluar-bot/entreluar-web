"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { JournalPost, Product, Quote } from "../types";

type SearchResults = { query: string; papo: JournalPost[]; estudei: JournalPost[]; vitrine: Product[]; pilulas: Quote[] };

const emptyResults: SearchResults = { query: "", papo: [], estudei: [], vitrine: [], pilulas: [] };

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "");
}

export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const query = term.trim();
    const timeout = setTimeout(() => {
      if (query.length < 2) {
        setResults(emptyResults);
        setLoading(false);
        return;
      }
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((response) => response.json())
        .then((data) => setResults(data))
        .catch(() => setResults(emptyResults))
        .finally(() => setLoading(false));
    }, query.length < 2 ? 0 : 300);
    return () => clearTimeout(timeout);
  }, [term]);

  const totalResults = results.papo.length + results.estudei.length + results.vitrine.length + results.pilulas.length;

  const close = () => {
    setOpen(false);
    setTerm("");
    setResults(emptyResults);
  };

  return (
    <>
      <button type="button" className="newsletter-trigger" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
        <span aria-hidden="true">⌕</span>
        <span className="newsletter-trigger__full">Buscar</span>
        <span className="newsletter-trigger__short">Buscar</span>
      </button>

      {open && (
        <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Busca no site">
          <div className="search-panel glass-panel">
            <div className="search-panel__head">
              <input
                ref={inputRef}
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="O que você quer encontrar?"
                className="search-input"
                aria-label="O que você quer encontrar?"
              />
              <button
                type="button"
                onClick={close}
                aria-label="Fechar busca"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--line)] text-xl leading-none text-[var(--muted)] transition hover:border-[var(--champagne)] hover:text-[var(--champagne-pale)]"
              >
                ×
              </button>
            </div>

            <div className="search-results" aria-live="polite">
              {term.trim().length < 2 && (
                <p className="muted text-sm">Digite pelo menos 2 letras — retinal, pele seca, queda de cabelo, menopausa…</p>
              )}
              {loading && <p className="muted text-sm">Procurando…</p>}
              {!loading && term.trim().length >= 2 && totalResults === 0 && (
                <p className="muted text-sm">Nada por aqui ainda para “{term.trim()}”. Tenta outra palavra?</p>
              )}

              {results.estudei.length > 0 && (
                <div className="search-group">
                  <p className="eyebrow">Estudei para te explicar</p>
                  {results.estudei.map((post) => (
                    <Link key={post.id} href={`/resenhas/${post.id}`} className="search-result-row" onClick={close}>
                      <strong>{post.title}</strong>
                      <span>{stripHtml(post.content).slice(0, 90)}…</span>
                    </Link>
                  ))}
                </div>
              )}

              {results.papo.length > 0 && (
                <div className="search-group">
                  <p className="eyebrow">Papo de Mulher</p>
                  {results.papo.map((post) => (
                    <Link key={post.id} href={`/blog/${post.id}`} className="search-result-row" onClick={close}>
                      <strong>{post.title}</strong>
                      <span>{stripHtml(post.content).slice(0, 90)}…</span>
                    </Link>
                  ))}
                </div>
              )}

              {results.vitrine.length > 0 && (
                <div className="search-group">
                  <p className="eyebrow">Vitrine</p>
                  {results.vitrine.map((product) => (
                    <Link key={product.id} href={`/vitrine/${product.id}`} className="search-result-row" onClick={close}>
                      <strong>{product.title}</strong>
                      <span>{stripHtml(product.description).slice(0, 90)}…</span>
                    </Link>
                  ))}
                </div>
              )}

              {results.pilulas.length > 0 && (
                <div className="search-group">
                  <p className="eyebrow">Pílulas</p>
                  {results.pilulas.map((quote) => (
                    <Link key={quote.id} href="/pilulas" className="search-result-row" onClick={close}>
                      <span>“{quote.quote.slice(0, 110)}{quote.quote.length > 110 ? "…" : ""}”</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
