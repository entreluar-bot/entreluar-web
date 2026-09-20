"use client";
import { useState } from "react";

export default function NewsletterBar() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (data.error) {
        setMessage(data.error);
      } else {
        setMessage("💖 Sucesso!");
        setEmail("");
      }
    } catch (err) {
      setMessage("Erro.");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <div className="bg-[#1a0f12] border-b border-[var(--color-wine-light)] py-1.5 px-4 flex justify-center items-center text-[10px] md:text-xs">
      {message ? (
        <span className="text-[var(--color-gold)] font-bold tracking-widest uppercase">{message}</span>
      ) : (
        <form onSubmit={handleSubscribe} className="flex items-center gap-2 max-w-lg w-full justify-center">
          <span className="text-[var(--color-gold-light)] uppercase tracking-widest hidden md:inline">Cartas para amigas:</span>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu e-mail..." 
            className="bg-transparent border border-[var(--color-wine-light)] rounded-full px-3 py-1 text-[var(--color-gold)] focus:outline-none focus:border-[var(--color-gold)] w-40 md:w-48 placeholder:text-[var(--color-wine-light)]"
            required
          />
          <button 
            type="submit" 
            disabled={loading}
            className="text-[var(--color-gold)] font-bold uppercase hover:text-white transition-colors"
          >
            Assinar ✨
          </button>
        </form>
      )}
    </div>
  );
}
