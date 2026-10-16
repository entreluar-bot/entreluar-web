"use client";

import { useEffect, useState } from "react";
import { getSessionId } from "./CampaignTracker";

export default function CommentLikeButton({ commentId, initialCount }: { commentId: string; initialCount: number }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const storageKey = `entreluar_comment_like_${commentId}`;

  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        if (localStorage.getItem(storageKey) === "1") setLiked(true);
      } catch {
        // Sem armazenamento, só não pré-marca.
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [storageKey]);

  const toggle = async () => {
    if (busy) return;
    const next = !liked;
    setBusy(true);
    setLiked(next);
    setCount((value) => Math.max(0, value + (next ? 1 : -1)));
    try {
      const response = await fetch("/api/comment-like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, voterId: getSessionId(), liked: next }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (typeof data.count === "number") setCount(data.count);
      try {
        if (next) localStorage.setItem(storageKey, "1");
        else localStorage.removeItem(storageKey);
      } catch {
        // Sem armazenamento, a curtida ainda foi registrada.
      }
    } catch {
      setLiked(!next);
      setCount((value) => Math.max(0, value + (next ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={toggle} aria-pressed={liked} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] px-4 text-sm text-[var(--champagne-pale)]" style={liked ? { borderColor: "var(--champagne)", background: "rgba(230,189,120,.16)" } : undefined}>
      <span aria-hidden="true">💛</span> Me identifiquei{count > 0 ? ` · ${count}` : ""}
    </button>
  );
}
