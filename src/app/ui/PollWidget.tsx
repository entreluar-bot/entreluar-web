"use client";

import { useEffect, useState } from "react";
import { getSessionId } from "./CampaignTracker";

export type PollOption = { id: string; label: string };
export type PollData = { id: string; question: string };

export default function PollWidget({
  poll,
  options,
  counts,
}: {
  poll: PollData;
  options: PollOption[];
  counts: Record<string, number>;
}) {
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>(counts);
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const storageKey = `entreluar_poll_${poll.id}_voted`;

  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) setVotedOptionId(stored);
      } catch {
        // localStorage indisponível — só não pré-marca o voto, sem quebrar a página.
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [storageKey]);

  const totalVotes = Object.values(voteCounts).reduce((sum, n) => sum + n, 0);

  const vote = async (optionId: string) => {
    if (votedOptionId || submitting) return;
    setSubmitting(true);
    setVotedOptionId(optionId);
    try {
      const response = await fetch("/api/poll-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: poll.id, optionId, voterId: getSessionId() }),
      });
      const data = await response.json();
      if (data.counts) setVoteCounts(data.counts);
      const finalOptionId = data.votedOptionId || optionId;
      setVotedOptionId(finalOptionId);
      try {
        localStorage.setItem(storageKey, finalOptionId);
      } catch {
        // sem localStorage, o voto ainda foi registrado no servidor — só não fica lembrado neste navegador.
      }
    } catch {
      // mantém o voto otimista na tela mesmo se a rede falhar.
    }
    setSubmitting(false);
  };

  return (
    <section className="glass-panel my-8 rounded-[28px] p-6 md:p-8" aria-label="Enquete rápida">
      <p className="eyebrow">E você?</p>
      <h2 className="font-display mt-2 text-2xl leading-tight text-[var(--champagne-pale)]">{poll.question}</h2>

      <div className="mt-6 grid gap-3" aria-live="polite">
        {options.map((option) => {
          const count = voteCounts[option.id] || 0;
          const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
          const isMine = votedOptionId === option.id;

          if (!votedOptionId) {
            return (
              <button key={option.id} type="button" onClick={() => vote(option.id)} disabled={submitting} className="poll-option-btn">
                {option.label}
              </button>
            );
          }

          return (
            <div key={option.id} className="poll-result">
              <div className="poll-result__row">
                <span>{option.label}{isMine && " · sua resposta"}</span>
                <span>{percent}%</span>
              </div>
              <div className="poll-result__bar"><span style={{ width: `${percent}%` }} /></div>
            </div>
          );
        })}
      </div>

      {votedOptionId && (
        <p className="muted mt-4 text-xs">{totalVotes} {totalVotes === 1 ? "resposta" : "respostas"} até agora.</p>
      )}
    </section>
  );
}
