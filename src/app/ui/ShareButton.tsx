"use client";

import { useState } from "react";

type ShareButtonProps = {
  title: string;
  url: string;
  shareText: string;
  className?: string;
  variant?: "button" | "inline";
};

export default function ShareButton({ title, url, shareText, className = "", variant = "button" }: ShareButtonProps) {
  const [message, setMessage] = useState("");

  const share = async () => {
    setMessage("");
    const shareData = { title, text: shareText, url };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage("Link copiado. Agora é só mandar para aquela amiga que vai amar isso.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        setMessage("Link copiado. Agora é só mandar para aquela amiga que vai amar isso.");
      } catch {
        setMessage("Não consegui copiar agora. Você pode copiar o link direto da barra do navegador.");
      }
    }
  };

  if (variant === "inline") {
    return (
      <span className={`quick-share ${className}`}>
        <button type="button" onClick={share} className="quick-link">
          Compartilhar ↗
        </button>
        {message && <span className="quick-share-message" role="status">{message}</span>}
      </span>
    );
  }

  return (
    <div className={`share-action ${className}`}>
      <button type="button" onClick={share} className="ghost-button share-button">
        Compartilhar com uma amiga
      </button>
      {message && <p className="share-message" role="status">{message}</p>}
    </div>
  );
}
