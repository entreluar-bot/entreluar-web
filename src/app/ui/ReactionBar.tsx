"use client";

import { useEffect, useState } from "react";
import { getSessionId } from "./CampaignTracker";
import type { ReactionCounts } from "@/lib/reactions";

type Reaction = "like" | "dislike";

export default function ReactionBar({
  journalId,
  initialCounts,
}: {
  journalId: string;
  initialCounts: ReactionCounts;
}) {
  const [counts, setCounts] = useState<ReactionCounts>(initialCounts);
  const [myReaction, setMyReaction] = useState<Reaction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const storageKey = `entreluar_reaction_${journalId}`;

  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored === "like" || stored === "dislike") setMyReaction(stored);
      } catch {
        // localStorage indisponível — só não pré-marca a reação, sem quebrar a página.
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [storageKey]);

  const react = async (clicked: Reaction) => {
    if (submitting) return;
    const next: Reaction | null = myReaction === clicked ? null : clicked;
    const previous = myReaction;

    setSubmitting(true);
    setMyReaction(next);
    setCounts((current) => {
      const updated = { ...current };
      if (previous) updated[previous] = Math.max(0, updated[previous] - 1);
      if (next) updated[next] += 1;
      return updated;
    });

    try {
      const response = await fetch("/api/reaction-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journalId, voterId: getSessionId(), reaction: next }),
      });
      const data = await response.json();
      if (data.counts) setCounts(data.counts);
      try {
        if (next) localStorage.setItem(storageKey, next);
        else localStorage.removeItem(storageKey);
      } catch {
        // sem localStorage, a reação ainda foi registrada no servidor — só não fica lembrada neste navegador.
      }
    } catch {
      // mantém a reação otimista na tela mesmo se a rede falhar.
    }
    setSubmitting(false);
  };

  return (
    <div className="reaction-bar" role="group" aria-label="Reagir a este conteúdo">
      <button
        type="button"
        onClick={() => react("like")}
        disabled={submitting}
        className={`reaction-btn ${myReaction === "like" ? "reaction-btn--active" : ""}`}
        aria-pressed={myReaction === "like"}
      >
        👍 Curti <span className="reaction-count">{counts.like}</span>
      </button>
      <button
        type="button"
        onClick={() => react("dislike")}
        disabled={submitting}
        className={`reaction-btn ${myReaction === "dislike" ? "reaction-btn--active" : ""}`}
        aria-pressed={myReaction === "dislike"}
      >
        👎 Não curti <span className="reaction-count">{counts.dislike}</span>
      </button>
    </div>
  );
}
