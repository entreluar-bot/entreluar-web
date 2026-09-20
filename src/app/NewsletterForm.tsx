"use client";
import { useState } from "react";

export default function NewsletterForm() {
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
        setMessage(data.message || "Inscrição confirmada! 🎉");
        setEmail("");
      }
    } catch (err) {
      setMessage("Erro ao conectar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubscribe} className="max-w-md mx-auto mt-8 flex flex-col sm:flex-row gap-3">
      <input 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Seu melhor e-mail" 
        className="flex-1 bg-[var(--color-wine-dark)] border border-[var(--color-wine-light)] rounded-full px-6 py-3 text-[var(--color-gold-light)] focus:outline-none focus:border-[var(--color-gold)]"
        required
      />
      <button 
        type="submit" 
        disabled={loading}
        className="bg-gradient-to-r from-[var(--color-gold)] to-[#b5952f] text-[var(--color-wine-dark)] px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50"
      >
        {loading ? "Enviando..." : "Assinar"}
      </button>
      {message && <p className="text-sm mt-3 w-full text-center text-[var(--color-gold)]">{message}</p>}
    </form>
  );
}
